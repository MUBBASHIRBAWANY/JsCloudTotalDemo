import logModal from "../Modal/LogModal.js";

export const GetAllLog = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Get all logs first
        let logs = await logModal.find();
        
        // Manually parse dates with AM/PM
        logs = logs.map(log => {
            const parsedDate = new Date(
                log.createdAt.replace(/(\w{3} \d{2}, \d{4}, \d{2}:\d{2}) (AM|PM)/, (match, date, ampm) => {
                    let [month, day, year, time] = date.match(/(\w{3}) (\d{2}), (\d{4}), (\d{2}:\d{2})/).slice(1);
                    let [hours, minutes] = time.split(':');
                    hours = parseInt(hours);
                    if (ampm === 'PM' && hours !== 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                    return `${month} ${day}, ${year} ${hours.toString().padStart(2, '0')}:${minutes}`;
                })
            );
            return { ...log.toObject(), parsedDate };
        });
        
        // Filter by date
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);
            
            logs = logs.filter(log => {
                if (start && log.parsedDate < start) return false;
                if (end && log.parsedDate > end) return false;
                return true;
            });
        }
        
        // Sort by date
        logs.sort((a, b) => b.parsedDate - a.parsedDate);
        
        res.status(200).send(logs);
    }
    catch (err) {
        console.log(err);
        res.status(400).send("something went wrong");
    }
};

