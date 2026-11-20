import { useEffect } from "react";
import Swal from "sweetalert2";

export default function PaymentReminder() {
  useEffect(() => {
    Swal.fire({
      title: "💳 Payment Reminder",
      text: "The last payment date is December 5, 2025. Kindly make a payment.",
      icon: "info",
      confirmButtonText: "OK",
      confirmButtonColor: "#2563eb",
      backdrop: true,
    });
  }, []);

  return null; // no UI, just popup
}
