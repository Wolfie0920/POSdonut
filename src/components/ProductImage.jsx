import { useState } from "react";

// Product photos live in public/products. A product gets its picture by name, ignoring spaces, dashes and capitals
// ("Milk Chocolate", "milk-chocolate" and "MilkChocolate" all match). No photo? A letter circle is shown instead.
const FILES = {
  oreo: "oreo", milkchocolate: "milk-chocolate", mocha: "mocha", whitechocopeanut: "white-choco-peanut",
  chocowalnut: "choco-walnut", almondblanc: "almond-blanc", chocobutternut: "chocobutternut",
};
const key = (n = "") => n.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function ProductImage({ name, size = 96 }) {
  const [failed, setFailed] = useState(false);
  const file = FILES[key(name)];
  if (!file || failed) {
    return <span className="pimg initial" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
  }
  return <img className="pimg" src={`${import.meta.env.BASE_URL}products/${file}.png`} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} />;
}
