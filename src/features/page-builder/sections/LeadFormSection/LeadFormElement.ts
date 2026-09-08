import { FormElement } from "~/features/forms/form-element";

export class LeadFormElement extends FormElement {
  protected successMessage = "Got it. You will hear back from us within one business day.";

  protected async loadRules() {
    return (await import("./validate-lead-form")).leadForm;
  }
}

if (!customElements.get("lead-form")) {
  customElements.define("lead-form", LeadFormElement);
}
