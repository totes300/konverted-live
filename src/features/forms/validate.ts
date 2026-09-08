import { z } from "zod";

/**
 * The plumbing both sides of a form share. A form declares one Zod object schema; the browser runs
 * the parse on submit so an empty or malformed field costs no round trip, and the endpoint runs the
 * same parse because a client can always be bypassed.
 *
 * Keep this free of server-only imports: it is loaded in the browser too.
 */
export type FormFieldErrors = Partial<Record<string, string>>;

export type FormValidation<Data> = { ok: true; data: Data } | { ok: false; fieldErrors: FormFieldErrors; formError?: string };

type FormSchema = z.ZodObject<Record<string, z.ZodType>>;

/** An option list as the tuple `z.enum` wants, so a control's labels and its accepted values stay one list. */
export const optionValues = <T extends readonly { value: string }[]>(options: T) =>
  options.map(({ value }) => value) as [T[number]["value"], ...T[number]["value"][]];

/**
 * A checkbox group submits its name once per checked box, so its field is read with `getAll`. Which
 * fields those are is the schema's business like everything else here: a scalar schema turns an array
 * away on type alone, while anything built on `z.array` gets far enough to complain about its contents.
 *
 * A union reports the rejection as one `invalid_union` issue wrapping its branches, so the check
 * recurses: only a union every branch of which turns the array away on type is itself a scalar. That
 * is what keeps `z.enum([...]).or(z.literal(""))`, the optional radio group idiom, a string field.
 */
type ArityIssue = { code?: string; errors?: ArityIssue[][] };

function rejectsArrayOnType(issues: ArityIssue[]): boolean {
  return issues.some(
    ({ code, errors }) =>
      code === "invalid_type" ||
      code === "invalid_value" ||
      (code === "invalid_union" && (errors ?? []).every((branch) => rejectsArrayOnType(branch)))
  );
}

function takesManyValues(field: z.ZodType) {
  const result = field.safeParse([]);

  return result.success || !rejectsArrayOnType(result.error.issues as ArityIssue[]);
}

function readValues(formData: FormData, names: readonly string[], many: ReadonlySet<string>) {
  return Object.fromEntries(
    names.map((name) => [name, many.has(name) ? formData.getAll(name).map(String) : String(formData.get(name) ?? "")])
  );
}

function parse<Schema extends FormSchema>(schema: Schema, names: readonly string[], values: unknown) {
  const result = schema.safeParse(values);

  if (result.success) {
    return { ok: true, data: result.data } satisfies FormValidation<z.output<Schema>>;
  }

  const tree = z.treeifyError(result.error) as {
    errors?: string[];
    properties?: Record<string, { errors: string[] } | undefined>;
  };
  const fieldErrors: FormFieldErrors = {};

  for (const name of names) {
    const message = tree.properties?.[name]?.errors[0];

    if (message) {
      fieldErrors[name] = message;
    }
  }

  // A rule belonging to the object rather than to one field (`.refine`) has no control to sit under,
  // and dropping it would reject the submission with nothing on screen to explain why.
  return { ok: false, fieldErrors, formError: tree.errors?.[0] } satisfies FormValidation<z.output<Schema>>;
}

/**
 * One definition per form, shared by its markup, its element and its endpoint. The schema is the only
 * place fields are named, so nothing can drift out of step with it: `field()` spreads a name and the
 * `required` derived from that schema onto a control, and `check()` parses a raw `FormData`.
 */
export function defineForm<Schema extends FormSchema>(schema: Schema) {
  const names = Object.keys(schema.shape);
  const many = new Set(
    Object.entries(schema.shape)
      .filter(([, field]) => takesManyValues(field))
      .map(([name]) => name)
  );
  // One blank parse answers "which fields does this schema refuse to go without" for the whole form.
  const blank = parse(schema, names, Object.fromEntries(names.map((name) => [name, many.has(name) ? [] : ""])));
  const required = new Set(blank.ok ? [] : names.filter((name) => blank.fieldErrors[name]));

  return {
    field: (name: keyof Schema["shape"] & string) => ({ name, required: required.has(name) }),
    read: (formData: FormData) => readValues(formData, names, many) as z.input<Schema>,
    validate: (values: unknown) => parse(schema, names, values),
    check: (formData: FormData) => parse(schema, names, readValues(formData, names, many)),
  };
}
