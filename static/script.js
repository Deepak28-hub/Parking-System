document.addEventListener("DOMContentLoaded", function () {
    // Initialize date and time display
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize parking data
    fetchParkingStatus();
    setInterval(fetchParkingStatus, 5000);
    
    // Initialize bookings
    fetchBookings();
    
    // Event listeners
    document.getElementById('refresh-video').addEventListener('click', function() {
        const videoFeed = document.getElementById('video-feed');
        videoFeed.src = videoFeed.src + '?' + new Date().getTime();
    });
    
    document.getElementById('book-button').addEventListener('click', bookSlot);
    
    // Add refresh bookings button if it exists
    const refreshBookingsBtn = document.getElementById('refresh-bookings');
    if (refreshBookingsBtn) {
        refreshBookingsBtn.addEventListener('click', fetchBookings);
    }
});

function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    
    document.getElementById('current-date').textContent = now.toLocaleDateString(undefined, dateOptions);
    document.getElementById('current-time').textContent = now.toLocaleTimeString(undefined, timeOptions);
}

function fetchParkingStatus() {
    fetch("/api/parking-status")
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError("Error loading parking data");
                return;
            }
            
            updateParkingStats(data);
            updateParkingMap(data);
            updateBookingOptions(data);
        })
        .catch(error => {
            console.error("Error fetching parking data:", error);
            showError("Failed to load parking data. Please try again.");
        });
}

function fetchBookings() {
    fetch("/api/bookings")
        .then(response => response.json())
        .then(data => {
            updateBookingsDisplay(data.bookings);
            updateBookingsTable(data.bookings);
        })
        .catch(error => {
            console.error("Error fetching bookings:", error);
        });
}

function updateParkingStats(data) {
    const totalSlots = data.total;
    const freeSlots = data.free;
    const bookedSlots = data.booked || 0;
    const occupiedSlots = totalSlots - freeSlots - bookedSlots;
    const occupancyRate = ((occupiedSlots / totalSlots) * 100).toFixed(1);
    
    // Update counters
    document.getElementById('total-slots').querySelector('.count').textContent = totalSlots;
    document.getElementById('available-count').querySelector('.count').textContent = freeSlots;
    document.getElementById('available-count-card').textContent = freeSlots;
    document.getElementById('occupied-count').textContent = occupiedSlots;
    document.getElementById('booked-count').textContent = bookedSlots;
    document.getElementById('occupancy-rate').textContent = occupancyRate + '%';
    
    // Update gauge
    const gaugeValue = document.querySelector('.gauge-value');
    gaugeValue.textContent = occupancyRate + '%';
    
    // Update gauge arc rotation based on occupancy
    const gaugeArc = document.querySelector('.gauge-arc');
    const rotationDegree = (occupancyRate / 100) * 180;
    gaugeArc.style.transform = `rotate(${rotationDegree}deg)`;
    
    // Update chart segments
    const availableSegment = document.querySelector('.chart-segment.available');
    const occupiedSegment = document.querySelector('.chart-segment.occupied');
    const bookedSegment = document.querySelector('.chart-segment.booked');
    
    // Calculate percentages for chart
    const availablePercentage = (freeSlots / totalSlots) * 100;
    const occupiedPercentage = (occupiedSlots / totalSlots) * 100;
    const bookedPercentage = (bookedSlots / totalSlots) * 100;
    
    // Update chart segments with percentages
    availableSegment.style.width = `${availablePercentage}%`;
    occupiedSegment.style.width = `${occupiedPercentage}%`;
    bookedSegment.style.width = `${bookedPercentage}%`;
}

function updateParkingMap(data) {
    const slotsContainer = document.getElementById('parking-slots');
    slotsContainer.innerHTML = ''; // Clear previous data
    
    // Create slots grid - adjust for 70 slots
    const rows = 7;
    const cols = 10;
    const slotData = data.status;
    
    for (let i = 0; i < rows * cols; i++) {
        if (i >= 70) break; // Limit to 70 slots
        
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('slot');
        slotDiv.dataset.id = i;
        
        const slotStatus = slotData[i] || 'unknown';
        if (slotStatus === 'free') {
            slotDiv.classList.add('available');
        } else if (slotStatus === 'occupied') {
            slotDiv.classList.add('occupied');
        } else if (slotStatus === 'booked') {
            slotDiv.classList.add('booked');
        }
        
        // Add slot number and status
        slotDiv.innerHTML = `
            <div class="slot-number">${i}</div>
            <div class="slot-status">${slotStatus.charAt(0).toUpperCase() + slotStatus.slice(1)}</div>
        `;
        
        // Add click event for booking
        slotDiv.addEventListener('click', function() {
            if (slotStatus === 'free') {
                document.getElementById('slot-select').value = i;
                document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        slotsContainer.appendChild(slotDiv);
    }
}

function updateBookingOptions(data) {
    const slotSelect = document.getElementById('slot-select');
    // Clear previous options except the first one
    while (slotSelect.options.length > 1) {
        slotSelect.remove(1);
    }
    
    // Add available slots to select
    Object.entries(data.status).forEach(([slotId, status]) => {
        if (status === 'free') {
            const option = document.createElement('option');
            option.value = slotId;
            option.textContent = `Slot ${slotId}`;
            slotSelect.appendChild(option);
        }
    });
}

function updateBookingsDisplay(bookings) {
    // Update booked slots on map
    // First, reset all slots to their original state
    fetchParkingStatus();
    
    // Then, highlight booked slots
    bookings.forEach(booking => {
        const slotId = booking[1]; // Assuming booking[1] is the slot_id
        const slotDiv = document.querySelector(`.slot[data-id="${slotId}"]`);
        
        if (slotDiv) {
            slotDiv.classList.remove('available', 'occupied');
            slotDiv.classList.add('booked');
            slotDiv.querySelector('.slot-status').textContent = 'Booked';
        }
    });
}

function updateBookingsTable(bookings) {
    const bookingsList = document.getElementById('bookings-list');
    const noBookingsMessage = document.getElementById('no-bookings-message');
    
    if (!bookingsList) return; // If the table doesn't exist, exit
    
    // Clear previous bookings
    bookingsList.innerHTML = '';
    
    if (bookings.length === 0) {
        // Show no bookings message if it exists
        if (noBookingsMessage) {
            noBookingsMessage.style.display = 'block';
        }
        return;
    }
    
    // Hide no bookings message if it exists
    if (noBookingsMessage) {
        noBookingsMessage.style.display = 'none';
    }
    
    // Add bookings to the table
    bookings.forEach(booking => {
        const [id, slotId, numberPlate, userId] = booking;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Slot ${slotId}</td>
            <td>${numberPlate || 'N/A'}</td>
            <td>${userId}</td>
            <td>
                <button class="btn btn-cancel" data-slot="${slotId}">Cancel</button>
            </td>
        `;
        
        // Add cancel button event listener
        row.querySelector('.btn-cancel').addEventListener('click', function() {
            cancelBooking(slotId);
        });
        
        bookingsList.appendChild(row);
    });
}

function bookSlot() {
    const slotId = document.getElementById('slot-select').value;
    const userId = document.getElementById('user-id').value;
    const numberPlate = document.getElementById('number-plate') ? 
                        document.getElementById('number-plate').value : '';
    
    if (!slotId) {
        showBookingStatus('Please select a parking slot', 'error');
        return;
    }
    
    if (!userId) {
        showBookingStatus('Please enter your ID or name', 'error');
        return;
    }
    
    if (document.getElementById('number-plate') && !numberPlate) {
        showBookingStatus('Please enter your vehicle number plate', 'error');
        return;
    }
    
    fetch('/api/book-slot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            slot_id: slotId,
            user_id: userId,
            number_plate: numberPlate
        }),
    })
    .then(response => response.json())
    .then(data => {
        showBookingStatus(data.message, 'success');
        // Clear form fields
        document.getElementById('slot-select').value = '';
        document.getElementById('user-id').value = '';
        if (document.getElementById('number-plate')) {
            document.getElementById('number-plate').value = '';
        }
        // Refresh data
        fetchParkingStatus();
        fetchBookings();
    })
    .catch(error => {
        console.error('Error booking slot:', error);
        showBookingStatus('Failed to book slot. Please try again.', 'error');
    });
}

function cancelBooking(slotId) {
    fetch('/api/cancel-booking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slot_id: slotId }),
    })
    .then(response => response.json())
    .then(data => {
        showBookingStatus(data.message, 'success');
        fetchParkingStatus();
        fetchBookings();
    })
    .catch(error => {
        console.error('Error canceling booking:', error);
        showBookingStatus('Failed to cancel booking. Please try again.', 'error');
    });
}

function showBookingStatus(message, type) {
    const statusDiv = document.getElementById('booking-status');
    statusDiv.textContent = message;
    statusDiv.className = 'booking-status';
    statusDiv.classList.add(type);
    statusDiv.style.display = 'block';
    
    // Clear the status after 5 seconds
    setTimeout(() => {
        statusDiv.style.opacity = '0';
        setTimeout(() => {
            statusDiv.style.display = 'none';
            statusDiv.style.opacity = '1';
        }, 500);
    }, 5000);
}

function showError(message) {
    const slotsContainer = document.getElementById('parking-slots');
    slotsContainer.innerHTML = `<div class="error-message">${message}</div>`;
}
