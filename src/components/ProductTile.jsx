import ProductImage from "./ProductImage";
import { num, peso, stockStatus } from "../utils";

// One tappable product on the POS screen.
export default function ProductTile({ product, inCart, onAdd }) {
  const out = product.stock <= 0;
  const maxed = inCart >= product.stock;
  const st = stockStatus(product);
  return (
    <button className={`tile ${out ? "out" : ""}`} onClick={() => onAdd(product)} disabled={out || maxed}
      aria-label={`Add ${product.name}, ${peso(product.price)}, ${num(product.stock)} in stock`}>
      <ProductImage name={product.name} size={104} />
      <strong>{product.name}</strong>
      <span className="price">{peso(product.price)}</span>
      <small>{out ? "Out of stock" : maxed ? "All in cart" : `${num(product.stock)} in stock`}</small>
      {st === "low" && <i className="pill low">Low stock</i>}
      {inCart > 0 && <b className="badge">{inCart}</b>}
    </button>
  );
}
