document.addEventListener("DOMContentLoaded", function () {
    function fetchParkingStatus() {
        fetch("/api/parking-status")
            .then(response => response.json())
            .then(data => {
                const slotsContainer = document.getElementById("parking-slots");
                slotsContainer.innerHTML = ""; // Clear previous data

                if (data.error) {
                    slotsContainer.innerHTML = `<p style="color: red;">Error loading parking data</p>`;
                    return;
                }

                let availableSlots = [];

                Object.entries(data.status).forEach(([slot, status]) => {
                    let slotDiv = document.createElement("div");
                    slotDiv.classList.add("slot");
                    slotDiv.textContent = `Slot ${slot}`;
                    
                    if (status === "free") {
                        slotDiv.classList.add("free");
                        availableSlots.push(slot);
                    } else {
                        slotDiv.classList.add("occupied");
                    }

                    slotsContainer.appendChild(slotDiv);
                });

                // Display available slot numbers
                if (availableSlots.length > 0) {
                    slotsContainer.innerHTML += `<p>Available Slots: ${availableSlots.join(", ")}</p>`;
                } else {
                    slotsContainer.innerHTML += `<p>No slots available</p>`;
                }
            })
            .catch(error => {
                console.error("Error fetching parking data:", error);
                document.getElementById("parking-slots").innerHTML = `<p style="color: red;">Failed to load data</p>`;
            });
    }

    // Fetch parking data every 5 seconds
    fetchParkingStatus();
    setInterval(fetchParkingStatus, 5000);
});
