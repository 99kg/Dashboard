function checkLoginStatus() {
    fetch('/api/check-session')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                document.getElementById('usernameDisplay').textContent = data.username;
                document.getElementById('lastLoginDisplay').textContent = data.last_login;
                const welcomeSpan = document.querySelector('.logout-content span');
                if (welcomeSpan) {
                    welcomeSpan.textContent = `Welcome, ${data.username}`;
                }
            } else {
                window.location.href = '/login';
            }
        });
}
function updateLastLoginTime() {
    fetch('/api/update-last-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Last login time updated successfully!');
            }
        })
        .catch(error => {
            console.error('Error occurred while updating last login time:', error);
        });
}
document.addEventListener('DOMContentLoaded', function () {
    updateLastLoginTime();
    checkLoginStatus();
    document.getElementById('logoutBtn').addEventListener('click', function () {
        fetch('/logout').then(() => {
            window.location.href = '/login';
        });
    });
    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const refStartDateInput = document.getElementById('refStartDate');
    const refEndDateInput = document.getElementById('refEndDate');
    function validateDateInputs() {
        if (startDateInput.value > endDateInput.value) {
            endDateInput.value = startDateInput.value;
        }
        if (refStartDateInput.value > refEndDateInput.value) {
            refEndDateInput.value = refStartDateInput.value;
            refStartDateInput.value = refEndDateInput.value;
        }
        if (endDateInput.value < startDateInput.value) {
            endDateInput.value = startDateInput.value; 
        }
        if (refEndDateInput.value < refStartDateInput.value) {
            refEndDateInput.value = refStartDateInput.value; 
        }
    }
    endDateInput.addEventListener('change', validateDateInputs);
    refEndDateInput.addEventListener('change', validateDateInputs);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 8);
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    const defaultStartDate = formatDate(yesterday);
    const defaultEndDate = formatDate(yesterday);
    const defaultRefStartDate = formatDate(twoDaysAgo);
    const defaultRefEndDate = formatDate(twoDaysAgo);
    startDateInput.value = defaultStartDate;
    endDateInput.value = defaultEndDate;
    refStartDateInput.value = defaultRefStartDate;
    refEndDateInput.value = defaultRefEndDate;
    function updateStatusIndicator(elementId, isActive) {
        const indicator = document.querySelector(`#${elementId} .status-indicator`);
        if (indicator) {
            indicator.classList.toggle('status-active', isActive);
        }
    }
    function showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const resultValues = element.querySelectorAll('.result-value');
            resultValues.forEach(value => {
                value.textContent = '"Loading...';
                value.classList.add('loading');
            });
        }
        updateStatusIndicator(elementId, false);
    }
    function hideLoading(elementId) {
        updateStatusIndicator(elementId, true);
        const element = document.getElementById(elementId);
        if (element) {
            const resultValues = element.querySelectorAll('.result-value.loading');
            resultValues.forEach(value => {
                value.classList.remove('loading');
            });
        }
    }
    function fetchAllTime(dateStart, dateEnd) {
        return fetch(`/api/alltime?date_start=${dateStart}&date_end=${dateEnd}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response exception!');
                }
                return response.json();
            })
            .catch(error => {
                console.error('Error occurred while fetching time periods:', error);
                throw error;
            });
    }
    function fetchDashboardData(params) {
        for (let i = 1; i <= 11; i++) {
            showLoading(`part${i}`);
        }
        return fetch('/api/dashboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response exception!');
                }
                return response.json();
            })
            .catch(error => {
                console.error('Error occurred while fetching dashboard data:', error);
                throw error;
            });
    }
    function displayResults(data) {
        window.dashboardData = data;
        if (data.part1) {
            document.getElementById('part1-total-in').textContent = data.part1.total_in || '-';
            document.getElementById('part1-total-out').textContent = data.part1.total_out || '-';
            document.getElementById('part1-compare').textContent = data.part1.compare || '-';
            const part1Change = document.getElementById('part1-change');
            part1Change.textContent = data.part1.percent_change ? `\u00A0\u00A0${data.part1.percent_change}%` : '-';
            part1Change.className = data.part1.percent_change >= 0 ?
                'result-value percent-positive' :
                'result-value percent-negative';
            if (data.part1.percent_change > 0) {
                $('.compare_up').show();
                $('.compare_up').css('visibility', 'visible');
                $('#part1-change').css('color', '#15AD63');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part1.percent_change < 0) {
                $('.compare_up').show();
                $('.compare_up').css('visibility', 'visible');
                $('#part1-change').css('color', '#DC2D65');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                part1Change.textContent = '\u00A0\u00A00%';
                $('#part1-change').css('color', '#7e797bff');
                $('.compare_up').css('visibility', 'hidden'); 
            }
            hideLoading('part1');
        }
        if (data.part2) {
            document.getElementById('part2-peak').textContent = data.part2.peak_period || '-';
            document.getElementById('part2-low').textContent = data.part2.low_period || '-';
            hideLoading('part2');
        }
        if (data.part3) fillCameraStats('part3', data.part3);
        if (data.part4) fillCameraStats('part4', data.part4);
        if (data.part5) fillCameraStats('part5', data.part5);
        if (data.part6) fillCameraStats('part6', data.part6);
        if (data.part7) fillAreaStats('part7', data.part7);
        if (data.part8) fillAreaStats('part8', data.part8);
        if (data.part9) fillAreaStats('part9', data.part9);
        if (data.part10) fillAreaStats('part10', data.part10);
        if (data.part11) {
            document.getElementById('part11-male').textContent = data.part11.male.current || '-';
            const maleChange = document.getElementById('part11-male-change');
            maleChange.textContent = data.part11.male.percent_change ? `${data.part11.male.percent_change}%` : '-';
            if (data.part11.male.percent_change > 0) {
                $('.value_up1').show();
                $('.value_up1').css('visibility', 'visible');
                $('#part11-male-change').css('color', '#15AD63');
                $('.value_up1').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.male.percent_change < 0) {
                $('.value_up1').show();
                $('.value_up1').css('visibility', 'visible');
                $('#part11-male-change').css('color', '#DC2D65');
                $('.value_up1').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                maleChange.textContent = '0%';
                $('#part11-male-change').css('color', '#7e797bff');
                $('.value_up1').css('visibility', 'hidden'); 
            }
            document.getElementById('part11-female').textContent = data.part11.female.current || '-';
            const femaleChange = document.getElementById('part11-female-change');
            femaleChange.textContent = data.part11.female.percent_change ? `${data.part11.female.percent_change}%` : '-';
            if (data.part11.female.percent_change > 0) {
                $('.value_up2').show();
                $('.value_up2').css('visibility', 'visible');
                $('#part11-female-change').css('color', '#15AD63');
                $('.value_up2').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.female.percent_change < 0) {
                $('.value_up2').show();
                $('.value_up2').css('visibility', 'visible');
                $('#part11-female-change').css('color', '#DC2D65');
                $('.value_up2').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                femaleChange.textContent = '0%';
                $('#part11-female-change').css('color', '#7e797bff');
                $('.value_up2').css('visibility', 'hidden'); 
            }
            document.getElementById('part11-children').textContent = data.part11.children.current || '-';
            const childrenChange = document.getElementById('part11-children-change');
            childrenChange.textContent = data.part11.children.percent_change ? `${data.part11.children.percent_change}%` : '-';
            if (data.part11.children.percent_change > 0) {
                $('.value_up3').show();
                $('.value_up3').css('visibility', 'visible');
                $('#part11-children-change').css('color', '#15AD63');
                $('.value_up3').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.children.percent_change < 0) {
                $('.value_up3').show();
                $('.value_up3').css('visibility', 'visible');
                $('#part11-children-change').css('color', '#DC2D65');
                $('.value_up3').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                childrenChange.textContent = '0%';
                $('#part11-children-change').css('color', '#7e797bff');
                $('.value_up3').css('visibility', 'hidden'); 
            }
            document.getElementById('part11-unknown').textContent = data.part11.unknown.current || '-';
            const unknownChange = document.getElementById('part11-unknown-change');
            unknownChange.textContent = data.part11.unknown.percent_change ? `${data.part11.unknown.percent_change}%` : '-';
            if (data.part11.unknown.percent_change > 0) {
                $('.value_up4').show();
                $('.value_up4').css('visibility', 'visible');
                $('#part11-unknown-change').css('color', '#15AD63');
                $('.value_up4').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.unknown.percent_change < 0) {
                $('.value_up4').show();
                $('.value_up4').css('visibility', 'visible');
                $('#part11-unknown-change').css('color', '#DC2D65');
                $('.value_up4').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                unknownChange.textContent = '0%';
                $('#part11-unknown-change').css('color', '#7e797bff');
                $('.value_up4').css('visibility', 'hidden'); 
            }
            hideLoading('part11');
        }
    }
    function fillCameraStats(partId, stats) {
        document.getElementById(`${partId}-total-in`).textContent = stats.total_in || '-';
        document.getElementById(`${partId}-total-out`).textContent = stats.total_out || '-';
        document.getElementById(`${partId}-male`).textContent = stats.male_percent ? `${stats.male_percent}%` : '-';
        document.getElementById(`${partId}-female`).textContent = stats.female_percent ? `${stats.female_percent}%` : '-';
        document.getElementById(`${partId}-children`).textContent = stats.minor_percent ? `${stats.minor_percent}%` : '-';
        document.getElementById(`${partId}-unknown`).textContent = stats.unknown_percent ? `${stats.unknown_percent}%` : '-';
        document.getElementById(`${partId}-peak`).textContent = stats.peak_period || '-';
        document.getElementById(`${partId}-low`).textContent = stats.low_period || '-';
        hideLoading(partId);
    }
    function fillAreaStats(partId, stats) {
        document.getElementById(`${partId}-value-in`).textContent = stats.value_in || '0';
        document.getElementById(`${partId}-value-out`).textContent = stats.value_out || '0';
        document.getElementById(`${partId}-comparison`).textContent = stats.comparison || '-';
        const changeElement = document.getElementById(`${partId}-change`);
        changeElement.textContent = stats.percent_change ? `\u00A0\u00A0${stats.percent_change}%` : '-';
        changeElement.className = stats.percent_change >= 0 ?
            'result-value percent-positive' :
            'result-value percent-negative';
        if (stats.percent_change > 0) {
            if (partId === 'part7') {
                $('.comparison_up1').show();
                $('.comparison_up1').css('visibility', 'visible');
                $('#part7-change').css('color', '#15AD63');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part8') {
                $('.comparison_up2').show();
                $('.comparison_up2').css('visibility', 'visible');
                $('#part8-change').css('color', '#15AD63');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part9') {
                $('.comparison_up3').show();
                $('.comparison_up3').css('visibility', 'visible');
                $('#part9-change').css('color', '#15AD63');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else {
                $('.comparison_up4').show();
                $('.comparison_up4').css('visibility', 'visible');
                $('#part10-change').css('color', '#15AD63');
                $('.comparison_up4').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            }
        } else if (stats.percent_change < 0) {
            if (partId === 'part7') {
                $('.comparison_up1').show();
                $('.comparison_up1').css('visibility', 'visible');
                $('#part7-change').css('color', '#DC2D65');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part8') {
                $('.comparison_up2').show();
                $('.comparison_up2').css('visibility', 'visible');
                $('#part8-change').css('color', '#DC2D65');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part9') {
                $('.comparison_up3').show();
                $('.comparison_up3').css('visibility', 'visible');
                $('#part9-change').css('color', '#DC2D65');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                $('.comparison_up4').show();
                $('.comparison_up4').css('visibility', 'visible');
                $('#part10-change').css('color', '#DC2D65');
                $('.comparison_up4').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            }
        } else {
            changeElement.textContent = '\u00A0\u00A00%';
            if (partId === 'part7') {
                $('#part7-change').css('color', '#7e797bff');
                $('.comparison_up1').css('visibility', 'hidden'); 
            } else if (partId === 'part8') {
                $('#part8-change').css('color', '#7e797bff');
                $('.comparison_up2').css('visibility', 'hidden'); 
            } else if (partId === 'part9') {
                $('#part9-change').css('color', '#7e797bff');
                $('.comparison_up3').css('visibility', 'hidden'); 
            } else {
                $('#part10-change').css('color', '#7e797bff');
                $('.comparison_up4').css('visibility', 'hidden'); 
            }
        }
        var arr = [
            { "product_name_en": "Male", "count_pauchase": stats.male },
            { "product_name_en": "Female", "count_pauchase": stats.female },
            { "product_name_en": "Unknown", "count_pauchase": stats.unknown }
        ];
        if (arr.every(item => !item.count_pauchase)) {
            arr = [
                { "product_name_en": "No Data", "count_pauchase": 1 }
            ];
        }
        var a = arr.map(item => item.product_name_en);
        var b = arr.map(item => item.count_pauchase);
        if (partId === 'part7') {
            var ctx_1 = document.getElementById("canvas_1");
            var canvas_1 = new Chart(ctx_1, {
                type: 'doughnut',
                data: {
                    labels: a,
                    datasets: [{
                        label: '# of Votes',
                        data: b,
                        backgroundColor: [
                            'rgba(218, 18, 59, 1)',
                            'rgba(245, 97, 126, 1)',
                            'rgba(240, 193, 202, 1)'
                        ],
                        borderColor: [
                            'rgba(218, 18, 59, 1)',
                            'rgba(245, 97, 126, 1)',
                            'rgba(240, 193, 202, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    legend: {
                        display: false
                    },
                    scales: {
                        y: {
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } else if (partId === 'part8') {
            var ctx_2 = document.getElementById("canvas_2");
            var canvas_2 = new Chart(ctx_2, {
                type: 'doughnut',
                data: {
                    labels: a,
                    datasets: [{
                        label: '# of Votes',
                        data: b,
                        backgroundColor: [
                            'rgba(19, 196, 196, 1)',
                            'rgba(74, 177, 177, 1)',
                            'rgba(29, 84, 84, 1)'
                        ],
                        borderColor: [
                            'rgba(19, 196, 196, 1)',
                            'rgba(74, 177, 177, 1)',
                            'rgba(29, 84, 84, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    legend: {
                        display: false
                    },
                    scales: {
                        y: {
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } else if (partId === 'part9') {
            var ctx_3 = document.getElementById("canvas_3");
            var canvas_3 = new Chart(ctx_3, {
                type: 'doughnut',
                data: {
                    labels: a,
                    datasets: [{
                        label: '# of Votes',
                        data: b,
                        backgroundColor: [
                            'rgba(87, 55, 169, 1)',
                            'rgba(103, 124, 193, 1)',
                            'rgba(18, 23, 45, 1)'
                        ],
                        borderColor: [
                            'rgba(87, 55, 169, 1)',
                            'rgba(103, 124, 193, 1)',
                            'rgba(18, 23, 45, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    legend: {
                        display: false
                    },
                    scales: {
                        y: {
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } else {
            var ctx_4 = document.getElementById("canvas_4");
            var canvas_4 = new Chart(ctx_4, {
                type: 'doughnut',
                data: {
                    labels: a,
                    datasets: [{
                        label: '# of Votes',
                        data: b,
                        backgroundColor: [
                            'rgba(0, 126, 223, 1)',
                            'rgba(103, 124, 193, 1)',
                            'rgba(18, 23, 45, 1)'
                        ],
                        borderColor: [
                            'rgba(0, 126, 223, 1)',
                            'rgba(103, 124, 193, 1)',
                            'rgba(18, 23, 45, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    legend: {
                        display: false
                    },
                    scales: {
                        y: {
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
        hideLoading(partId);
    }
    function getDataAndUpdateUI() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const refStartDate = refStartDateInput.value;
        const refEndDate = refEndDateInput.value;
        const params = {
            time_start: startTime,
            time_end: endTime,
            date_start: startDate + ' ' + startTime,
            date_end: endDate + ' ' + endTime,
            ref_date_start: refStartDate + ' ' + startTime,
            ref_date_end: refEndDate + ' ' + endTime,
        };
        fetchDashboardData(params)
            .then(data => {
                displayResults(data);
            })
            .catch(error => {
                console.error('Error occurred while fetching dashboard data:', error);
                for (let i = 1; i <= 11; i++) {
                    const card = document.getElementById(`part${i}`);
                    if (card) {
                        const resultValues = card.querySelectorAll('.result-value');
                        resultValues.forEach(value => {
                            value.textContent = 'Failed to load data!';
                            value.classList.add('error');
                        });
                    }
                }
            });
    }
    function updateTimeSelectors() {
        const startDate = startDateInput ? startDateInput.value || defaultStartDate : defaultStartDate;
        const endDate = endDateInput ? endDateInput.value || defaultEndDate : defaultEndDate;
        fetchAllTime(startDate, endDate)
            .then(timeSlots => {
                const currentStartTime = startTimeInput.value;
                const currentEndTime = endTimeInput.value;
                startTimeInput.innerHTML = '';
                endTimeInput.innerHTML = '';
                timeSlots.forEach(slot => {
                    const optionStart = document.createElement('option');
                    optionStart.value = slot.start;
                    optionStart.textContent = slot.start;
                    startTimeInput.appendChild(optionStart);
                    const optionEnd = document.createElement('option');
                    optionEnd.value = slot.end;
                    optionEnd.textContent = slot.end;
                    endTimeInput.appendChild(optionEnd);
                });
                if (timeSlots.length > 0) {
                    if (currentStartTime && startTimeInput.querySelector(`option[value="${currentStartTime}"]`)) {
                        startTimeInput.value = currentStartTime;
                    } else {
                        startTimeInput.value = timeSlots[0].start;
                    }
                    updateEndTimeOptions();
                    if (currentEndTime && endTimeInput.querySelector(`option[value="${currentEndTime}"]`)) {
                        endTimeInput.value = currentEndTime;
                    } else {
                        endTimeInput.value = timeSlots[timeSlots.length - 1].end;
                    }
                }
                getDataAndUpdateUI();
            })
            .catch(error => {
                console.error('Error occurred while fetching time periods:', error);
                startTimeInput.innerHTML = '';
                endTimeInput.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Error: Failed to load time periods!';
                startTimeInput.appendChild(option);
                endTimeInput.appendChild(option);
            });
    }
    function updateEndTimeOptions() {
        if (!startTimeInput || !endTimeInput) return;
        const selectedStart = startTimeInput.value;
        const endOptions = Array.from(endTimeInput.options);
        const validEndOptions = endOptions.filter(option =>
            option.value > selectedStart || option.value === ""
        );
        endTimeInput.innerHTML = '';
        validEndOptions.forEach(option => {
            endTimeInput.appendChild(option);
        });
        if (validEndOptions.length > 0) {
            endTimeInput.value = validEndOptions[0].value;
        }
    }
    function initializeDashboard() {
        if (!startDateInput || !endDateInput || !refStartDateInput || !refEndDateInput || !startTimeInput || !endTimeInput) {
            console.error("Unable to find required DOM elements!");
            return;
        }
        updateTimeSelectors();
        if (startDateInput) {
            startDateInput.addEventListener('change', function () {
                updateTimeSelectors();
            });
        }
        if (endDateInput) {
            endDateInput.addEventListener('change', function () {
                updateTimeSelectors();
            });
        }
        if (refStartDateInput) {
            refStartDateInput.addEventListener('change', function () {
                updateTimeSelectors();
            });
        }
        if (refEndDateInput) {
            refEndDateInput.addEventListener('change', function () {
                updateTimeSelectors();
            });
        }
        if (startTimeInput) {
            startTimeInput.addEventListener('change', function () {
                updateEndTimeOptions();
                getDataAndUpdateUI();
            });
        }
        if (endTimeInput) {
            endTimeInput.addEventListener('change', function () {
                getDataAndUpdateUI();
            });
        }
    }
    function setCharts(data, type = 'monthly_current') {
        const canvas = document.getElementById("canvas_11");
        const ctx = canvas.getContext('2d');
        if (window.dashboardChart) {
            window.dashboardChart.destroy();
        }
        const newCanvas = document.createElement('canvas');
        newCanvas.id = "canvas_11";
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        newCanvas.style.cssText = canvas.style.cssText;
        canvas.parentNode.replaceChild(newCanvas, canvas);
        const today = new Date();
        let labels = [];
        function getDayAbbreviation(dayIndex) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[dayIndex];
        }
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        switch (type) {
            case 'weekly_current':
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const month = d.getMonth() + 1;
                    const date = d.getDate();
                    const dayAbbr = getDayAbbreviation(d.getDay());
                    labels.push(`${month}/${date} ${dayAbbr}`);
                }
                break;
            case 'weekly_historical':
                const lastSunday = new Date(today);
                lastSunday.setDate(today.getDate() - today.getDay());
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(lastSunday);
                    d.setDate(lastSunday.getDate() - i);
                    const month = d.getMonth() + 1;
                    const date = d.getDate();
                    const dayAbbr = getDayAbbreviation(d.getDay());
                    labels.push(`${month}/${date} ${dayAbbr}`);
                }
                break;
            case 'monthly_current':
                {
                    let w = 1;
                    for (let i = 3; i >= 0; i--) {
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay() - (7 * i));
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        labels.push(`Week ${w} (${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`);
                        w++;
                    }
                    break;
                }
            case 'monthly_historical':
                {
                    let w = 1;
                    for (let i = 4; i >= 1; i--) {
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay() - (7 * i));
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        labels.push(`Week ${w} (${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`);
                        w++;
                    }
                    break;
                }
            case 'quarterly_current':
                for (let i = 2; i >= 0; i--) {
                    const d = new Date(today);
                    d.setMonth(today.getMonth() - i);
                    const year = d.getFullYear();
                    const monthName = monthNames[d.getMonth()];
                    labels.push(`${year} ${monthName}`);
                }
                break;
            case 'quarterly_historical':
                for (let i = 3; i >= 1; i--) {
                    const d = new Date(today);
                    d.setMonth(today.getMonth() - i);
                    const year = d.getFullYear();
                    const monthName = monthNames[d.getMonth()];
                    labels.push(`${year} ${monthName}`);
                }
                break;
            case 'yearly_current':
                for (let i = 3; i >= 0; i--) {
                    const q = Math.floor(today.getMonth() / 3) + 1 - i;
                    const year = today.getFullYear() - (q <= 0 ? 1 : 0);
                    const quarter = q > 0 ? q : q + 4;
                    labels.push(`${year} Q${quarter}`);
                }
                break;
            case 'yearly_historical':
                for (let i = 4; i >= 1; i--) {
                    const q = Math.floor(today.getMonth() / 3) + 1 - i;
                    const year = today.getFullYear() - (q <= 0 ? 1 : 0);
                    const quarter = q > 0 ? q : q + 4;
                    labels.push(`${year} Q${quarter}`);
                }
                break;
            default:
                for (let i = 3; i >= 0; i--) {
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay() - (7 * i));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    labels.push(`Week ${i + 1} (${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`);
                }
                break;
        }
        const datasets = [
            {
                label: 'Male',
                data: data[type].male,
                backgroundColor: '#5D4EB5',
                maxBarThickness: type.includes('monthly') ? 20 : 40
            },
            {
                label: 'Female',
                data: data[type].female,
                backgroundColor: '#15AD63',
                maxBarThickness: type.includes('monthly') ? 20 : 40
            },
            {
                label: 'Children',
                data: data[type].children,
                backgroundColor: '#24C4EF',
                maxBarThickness: type.includes('monthly') ? 20 : 40
            },
            {
                label: 'Unknown',
                data: data[type].unknown,
                backgroundColor: '#DC2D65',
                maxBarThickness: type.includes('monthly') ? 20 : 40
            }
        ];
        window.dashboardChart = new Chart(newCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                tooltips: {
                    enabled: false 
                },
                hover: {
                    animationDuration: 0 
                },
                legend: {
                    display: true,
                    position: 'right', 
                    labels: {
                        boxWidth: 20,
                        padding: 15,
                        fontSize: 14
                    }
                },
                scales: {
                    xAxes: [{
                        stacked: false,
                        ticks: {
                            callback: function (value, index, values) {
                                if (index === values.length - 1) return '';
                                return value;
                            }
                        }
                    }],
                    yAxes: [{
                        stacked: false,
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                },
                animation: {
                    onComplete: function () {
                        const ctx = this.chart.ctx;
                        ctx.save(); 
                        ctx.font = Chart.helpers.fontString(14, 'bold', Chart.defaults.global.defaultFontFamily);
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        this.data.datasets.forEach(function (dataset, i) {
                            const meta = this.getDatasetMeta(i);
                            if (meta.hidden) {
                                return; 
                            }
                            meta.data.forEach(function (bar, index) {
                                const data = dataset.data[index];
                                if (data) {
                                    ctx.fillStyle = '#ffffffff';
                                    ctx.fillText(data, bar._model.x, bar._model.y + 25);
                                }
                            });
                        }, this);
                        const xAxis = this.scales['x-axis-0'];
                        const lastTickIndex = xAxis.ticks.length - 1;
                        const lastTick = labels[labels.length - 1]; 
                        const lastTickX = xAxis.getPixelForTick(lastTickIndex);
                        ctx.fillStyle = 'red';
                        ctx.font = Chart.helpers.fontString(12, 'bold', Chart.defaults.global.defaultFontFamily);
                        ctx.fillText(lastTick, lastTickX, xAxis.bottom - 8);
                        ctx.restore(); 
                    }
                }
            }
        });
    }
    const canvasContainer = document.getElementById("canvas_11").parentNode;
    const loadingMessage = document.createElement("div");
    loadingMessage.id = "loadingMessage";
    loadingMessage.textContent = "Loading data, please wait...";
    loadingMessage.style.position = "absolute";
    loadingMessage.style.top = "50%";
    loadingMessage.style.left = "50%";
    loadingMessage.style.transform = "translate(-50%, -50%)";
    loadingMessage.style.fontSize = "50px";
    loadingMessage.style.color = "#555";
    loadingMessage.style.textAlign = "center";
    canvasContainer.style.position = "relative";
    canvasContainer.appendChild(loadingMessage);
    fetch('/api/footfall-distribution')
        .then(res => res.json())
        .then(data => {
            window.footfallDistributionData = data;
            setCharts(data, 'monthly_current');
            loadingMessage.remove();
        })
        .catch(error => {
            console.error('Error loading Monthly Footfall Distribution Overall data:', error);
            loadingMessage.textContent = "Failed to load data.";
            loadingMessage.style.color = "#DC2D65";
        });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (!window.footfallDistributionData) return; 
            switch (btn.id) {
                case 'historical-weekly-btn':
                    setCharts(window.footfallDistributionData, 'weekly_historical');
                    break;
                case 'historical-monthly-btn':
                    setCharts(window.footfallDistributionData, 'monthly_historical');
                    break;
                case 'historical-quarterly-btn':
                    setCharts(window.footfallDistributionData, 'quarterly_historical');
                    break;
                case 'historical-yearly-btn':
                    setCharts(window.footfallDistributionData, 'yearly_historical');
                    break;
                case 'current-weekly-btn':
                    setCharts(window.footfallDistributionData, 'weekly_current');
                    break;
                case 'current-monthly-btn':
                    setCharts(window.footfallDistributionData, 'monthly_current');
                    break;
                case 'current-quarterly-btn':
                    setCharts(window.footfallDistributionData, 'quarterly_current');
                    break;
                case 'current-yearly-btn':
                    setCharts(window.footfallDistributionData, 'yearly_current');
                    break;
            }
        });
    });
    initializeDashboard();
    var btn = document.getElementById('downloadPdfBtn');
    if (btn) {
        btn.onclick = function () {
            var element = document.body;
            var today = new Date();
            var yyyy = today.getFullYear();
            var mm = String(today.getMonth() + 1).padStart(2, '0');
            var dd = String(today.getDate()).padStart(2, '0');
            var filename = `dashboard_${yyyy}${mm}${dd}.pdf`;
            var opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: [380, 500], orientation: 'landscape' }
            };
            html2pdf().set(opt).from(element).save();
        }
    }
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
        <div class="camera-modal-content">
            <span class="close-modal">&times;</span>
            <img src="./themes/default/images/picture_total.png" alt="Camera View">
        </div>`;
    document.body.appendChild(modal);
    const cameraImageMap = {
        A6: './themes/default/images/picture_A6.png',
        A2: './themes/default/images/picture_A2.png',
        A3: './themes/default/images/picture_A3.png',
        A4: './themes/default/images/picture_A4.png',
    };
    document.querySelectorAll('.camera-title').forEach(title => {
        title.addEventListener('click', function () {
            const cameraId = this.getAttribute('data-camera-id');
            const imagePath = cameraImageMap[cameraId] || './themes/default/images/picture_total.png';
            const modal = document.querySelector('.camera-modal');
            const modalImage = modal.querySelector('img');
            modalImage.src = imagePath;
            modal.style.display = 'flex';
        });
    });
    document.querySelector('.close-modal').addEventListener('click', function () {
        const modal = document.querySelector('.camera-modal');
        modal.style.display = 'none';
    });
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            const modal = document.querySelector('.camera-modal');
            modal.style.display = 'none';
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            const modal = document.querySelector('.camera-modal');
            modal.style.display = 'none';
        }
    });
});