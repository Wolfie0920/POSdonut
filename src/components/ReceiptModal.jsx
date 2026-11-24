import { createPortal } from "react-dom";
import Receipt from "./Receipt";

// Shows the receipt with Print and Close buttons. Rendered on document.body so only the receipt prints.
export default function ReceiptModal({ order, onClose, closeLabel = "Close", heading }) {
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label="Receipt">
      <div className="card receipt-card">
        {heading && <h2 className="no-print">{heading}</h2>}
        <Receipt order={order} />
        <div className="row no-print">
          <button className="btn ghost" onClick={() => window.print()}>Print receipt</button>
          <button className="btn" onClick={onClose} autoFocus>{closeLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
