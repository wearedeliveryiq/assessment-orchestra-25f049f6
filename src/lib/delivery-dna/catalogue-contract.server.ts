import { sprint03Configuration } from "../delivery-intelligence/config";
import { deliveryDnaCatalogue } from "./catalogue";

function contractOf(capability: {
  id: string;
  label: string;
  order: number;
  weight: number;
  questions: Array<{ id: string; weight: number; required: boolean }>;
}) {
  return {
    id: capability.id,
    label: capability.label,
    order: capability.order,
    weight: capability.weight,
    questions: capability.questions.map(({ id, weight, required }) => ({ id, weight, required })),
  };
}

/** Fail closed server-side if the customer catalogue ever drifts from DIQ-203A. */
export function assertDeliveryDnaCatalogueContract(): void {
  const catalogueContract = [...deliveryDnaCatalogue.capabilities]
    .sort((a, b) => a.order - b.order)
    .map(contractOf);
  const configuredContract = [...sprint03Configuration.capabilities]
    .sort((a, b) => a.order - b.order)
    .map(contractOf);
  if (JSON.stringify(catalogueContract) !== JSON.stringify(configuredContract)) {
    throw new Error("DELIVERY_DNA_CATALOGUE_INVALID: DIQ-203C does not match DIQ-203A");
  }
}
