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
    
    // Add view bookings button event listener
    const viewBookingsBtn = document.getElementById('view-bookings');
    if (viewBookingsBtn) {
        viewBookingsBtn.addEventListener('click', function() {
            window.location.href = '/bookings';
        });
    }
    
    // Add event listener for update booking button
    const updateBookingBtn = document.getElementById('update-booking-btn');
    if (updateBookingBtn) {
        updateBookingBtn.addEventListener('click', function() {
            // Show modal with empty fields
            showUpdateBookingModal();
        });
    }
    
    // Add event listener for update booking form submission
    const updateBookingForm = document.getElementById('update-booking-form');
    if (updateBookingForm) {
        updateBookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateBooking();
        });
    }
    
    // Add event listener for cancel update button
    const cancelUpdateBtn = document.getElementById('cancel-update');
    if (cancelUpdateBtn) {
        cancelUpdateBtn.addEventListener('click', function() {
            hideUpdateBookingModal();
        });
    }
    
    // Close modal when clicking on X
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            hideUpdateBookingModal();
        });
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
    
    // Update gauge if it exists
    const gaugeValue = document.querySelector('.gauge-value');
    if (gaugeValue) {
        gaugeValue.textContent = occupancyRate + '%';
        
        // Update gauge arc rotation based on occupancy
        const gaugeArc = document.querySelector('.gauge-arc');
        if (gaugeArc) {
            const rotationDegree = (occupancyRate / 100) * 180;
            gaugeArc.style.transform = `rotate(${rotationDegree}deg)`;
        }
    }
    
    // Update chart segments if they exist
    const availableSegment = document.querySelector('.chart-segment.available');
    const occupiedSegment = document.querySelector('.chart-segment.occupied');
    const bookedSegment = document.querySelector('.chart-segment.booked');
    
    if (availableSegment && occupiedSegment && bookedSegment) {
        // Calculate percentages for chart
        const availablePercentage = (freeSlots / totalSlots) * 100;
        const occupiedPercentage = (occupiedSlots / totalSlots) * 100;
        const bookedPercentage = (bookedSlots / totalSlots) * 100;
        
        // Update chart segments with percentages
        availableSegment.style.width = `${availablePercentage}%`;
        occupiedSegment.style.width = `${occupiedPercentage}%`;
        bookedSegment.style.width = `${bookedPercentage}%`;
    }
}

function updateParkingMap(data) {
    const slotsContainer = document.getElementById('parking-slots');
    if (!slotsContainer) return;
    
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
        slotDiv.classList.add(slotStatus);
        
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
    if (!slotSelect) return;
    
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
    // This function is already updated in the parking status call
    // No need to duplicate the logic here
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
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Slot ${booking.slot_id}</td>
            <td>${booking.number_plate || 'N/A'}</td>
            <td>${booking.user_id}</td>
            <td>
                <button class="btn btn-update" data-slot="${booking.slot_id}" data-user="${booking.user_id}" data-plate="${booking.number_plate || 'N/A'}">Update</button>
                <button class="btn btn-cancel" data-slot="${booking.slot_id}">Cancel</button>
            </td>
        `;
        
        // Add cancel button event listener
        row.querySelector('.btn-cancel').addEventListener('click', function() {
            cancelBooking(booking.slot_id);
        });
        
        // Add update button event listener
        row.querySelector('.btn-update').addEventListener('click', function() {
            const slotId = this.getAttribute('data-slot');
            const userId = this.getAttribute('data-user');
            const numberPlate = this.getAttribute('data-plate');
            showUpdateBookingModal(slotId, userId, numberPlate);
        });
        
        bookingsList.appendChild(row);
    });
}

function bookSlot() {
    const slotId = document.getElementById('slot-select').value;
    const userId = document.getElementById('user-id').value;
    let numberPlate = 'N/A';
    
    if (document.getElementById('number-plate')) {
        numberPlate = document.getElementById('number-plate').value;
    }
    
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
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Error booking slot');
            });
        }
        return response.json();
    })
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
        showBookingStatus(error.message || 'Failed to book slot. Please try again.', 'error');
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

function showUpdateBookingModal(slotId = null, userId = '', numberPlate = '') {
    const modal = document.getElementById('update-booking-modal');
    if (!modal) return;
    
    // Set form values if provided
    if (slotId !== null) {
        document.getElementById('update-slot-id').value = slotId;
        document.getElementById('update-user-id').value = userId;
        document.getElementById('update-number-plate').value = numberPlate;
    }
    
    // Show the modal
    modal.style.display = 'block';
}

function hideUpdateBookingModal() {
    const modal = document.getElementById('update-booking-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateBooking() {
    const slotId = document.getElementById('update-slot-id').value;
    const userId = document.getElementById('update-user-id').value;
    const numberPlate = document.getElementById('update-number-plate').value || 'N/A';
    
    if (!slotId) {
        showBookingStatus('Please select a slot to update', 'error');
        return;
    }
    
    if (!userId) {
        showBookingStatus('Please enter user ID/name', 'error');
        return;
    }
    
    fetch('/api/update-booking', {
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
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Error updating booking');
            });
        }
        return response.json();
    })
    .then(data => {
        showBookingStatus(data.message, 'success');
        hideUpdateBookingModal();
        // Refresh data
        fetchParkingStatus();
        fetchBookings();
    })
    .catch(error => {
        console.error('Error updating booking:', error);
        showBookingStatus(error.message || 'Failed to update booking. Please try again.', 'error');
    });
}

function showBookingStatus(message, type) {
    const statusDiv = document.getElementById('booking-status');
    if (!statusDiv) return;
    
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
    if (slotsContainer) {
        slotsContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
}
