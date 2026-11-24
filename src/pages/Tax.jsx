import CrudPage from "../components/CrudPage";
import useCollection from "../hooks/useCollection";
import { peso } from "../utils";

// Property / machine ROI: every production run adds its output value as "recovered" against the machine's cost.
export default function Tax() {
  const production = useCollection("production").items;
  const recovered = (id) => production.filter((p) => p.machineId === id).reduce((s, p) => s + p.outputValue, 0);

  return <CrudPage title="Tax & machine ROI" collectionName="machines"
    fields={[{ name: "name", label: "Machine name" }, { name: "cost", label: "Purchase cost (₱)", type: "number" }]}
    columns={[{ key: "name", label: "Machine" }, { key: "cost", label: "Cost", render: (r) => peso(r.cost) },
      { key: "rec", label: "Recovered", render: (r) => peso(recovered(r.id)) },
      { key: "left", label: "Remaining", render: (r) => peso(Math.max(r.cost - recovered(r.id), 0)) },
      { key: "roi", label: "ROI status", render: (r) => recovered(r.id) >= r.cost
          ? <b className="good-text">ROI reached (+{peso(recovered(r.id) - r.cost)})</b>
          : `${Math.round((recovered(r.id) / r.cost) * 100)}% recovered` }]} />;
}
