

/**
 * Returns today's date (YYYY-MM-DD) from the internet using the browser's timezone.
 * Falls back to the system date if the online APIs are unreachable.
 */
export const getInternetDate = async () => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi";
  const urls = [
    `https://worldtimeapi.org/api/timezone/${timeZone}`,
    `https://timeapi.io/api/Time/current/zone?timeZone=${timeZone}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const raw = data?.datetime || data?.dateTime || data?.date;
      if (raw) {
        const datePart = String(raw).split("T")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
      }
    } catch {
      // try the next API
    }
  }

  // Fallback to system date if the internet is unreachable
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const updateDate = () => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear().toString().slice(-2);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    const timestamp = `${day} ${month} ${year} ${hours}:${minutes}`;

    return timestamp


}
   export const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(",", ""); 
    };
export const ConvetDate = (serial) => {
  // Handle empty/null/undefined - don't convert to Excel serial number 0
  if (serial === "" || serial === null || serial === undefined) return serial;

  // If serial is already in DD/MM/YYYY format
// If value is already in YYYY-MM-DD format
  if (typeof serial === "string" && /^\d{4}-\d{2}-\d{2}$/.test(serial)) {
    return serial;
  }

  // If value is in DD/MM/YYYY format
  if (typeof serial === "string" && serial.includes("/")) {
    const [day, month, year] = serial.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // If value is an Excel serial number
  if (!isNaN(serial)) {
    const utcDays = (serial - 25569) * 86400;
    const date = new Date(utcDays * 1000);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + timezoneOffset);

    const day = String(adjustedDate.getDate()).padStart(2, "0");
    const month = String(adjustedDate.getMonth() + 1).padStart(2, "0");
    const year = adjustedDate.getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Default fallback
  return serial;
};