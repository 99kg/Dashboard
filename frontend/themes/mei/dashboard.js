// 检查登录状态并更新用户信息
function checkLoginStatus() {
    fetch('/api/check-session')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                // 显示用户名和最后登录时间
                document.getElementById('usernameDisplay').textContent = data.username;
                document.getElementById('lastLoginDisplay').textContent = data.last_login;

                // 更新登出按钮区域的用户名显示
                const welcomeSpan = document.querySelector('.logout-content span');
                if (welcomeSpan) {
                    welcomeSpan.textContent = `Welcome, ${data.username}`;
                }
            } else {
                window.location.href = '/login';
            }
        });
}

// 更新用户最后登录时间
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
                // 最后登录时间已更新!
                console.log('Last login time updated successfully!');
            }
        })
        .catch(error => {
            // 更新最后登录时间时出错
            console.error('Error occurred while updating last login time:', error);
        });
}

document.addEventListener('DOMContentLoaded', function () {

    // 首先更新登录时间
    updateLastLoginTime();

    // 然后检查登录状态
    checkLoginStatus();

    // 登出功能 - 使用静态HTML中的按钮
    document.getElementById('logoutBtn').addEventListener('click', function () {
        fetch('/logout').then(() => {
            window.location.href = '/login';
        });
    });

    // 获取DOM元素
    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const refStartDateInput = document.getElementById('refStartDate');
    const refEndDateInput = document.getElementById('refEndDate');

    // 检查并修正日期
    function validateDateInputs() {
        // 检查 End Date 是否早于 Start Date
        if (endDateInput.value < startDateInput.value) {
            endDateInput.value = startDateInput.value; // 强制设置为 Start Date
        }

        // 检查 Compare End Date 是否早于 Compare Start Date
        if (refEndDateInput.value < refStartDateInput.value) {
            refEndDateInput.value = refStartDateInput.value; // 强制设置为 Compare Start Date
        }
    }

    // 添加事件监听器
    endDateInput.addEventListener('change', validateDateInputs);
    refEndDateInput.addEventListener('change', validateDateInputs);

    // 设置默认日期（昨天和前天）
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 8);

    // 格式化日期为YYYY-MM-DD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 设置默认日期
    const defaultStartDate = formatDate(yesterday);
    const defaultEndDate = formatDate(yesterday);
    const defaultRefStartDate = formatDate(twoDaysAgo);
    const defaultRefEndDate = formatDate(twoDaysAgo);

    startDateInput.value = defaultStartDate;
    endDateInput.value = defaultEndDate;
    refStartDateInput.value = defaultRefStartDate;
    refEndDateInput.value = defaultRefEndDate;

    // 更新状态指示器
    function updateStatusIndicator(elementId, isActive) {
        const indicator = document.querySelector(`#${elementId} .status-indicator`);
        if (indicator) {
            indicator.classList.toggle('status-active', isActive);
        }
    }

    // 显示加载状态
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

    // 恢复内容显示
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

    // 从后端获取时间段列表
    function fetchAllTime(dateStart, dateEnd) {
        return fetch(`/api/alltime?date_start=${dateStart}&date_end=${dateEnd}`)
            .then(response => {
                if (!response.ok) {
                    // 网络响应异常
                    throw new Error('Network response exception!');
                }
                return response.json();
            })
            .catch(error => {
                // 获取时间段时出错
                console.error('Error occurred while fetching time periods:', error);
                throw error;
            });
    }

    // 获取仪表板数据
    function fetchDashboardData(params) {
        // 显示所有部分的加载状态
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
                    // 网络响应异常
                    throw new Error('Network response exception!');
                }
                return response.json();
            })
            .catch(error => {
                // 获取仪表板数据时出错
                console.error('Error occurred while fetching dashboard data:', error);
                throw error;
            });
    }

    // 显示结果
    function displayResults(data) {

        window.dashboardData = data;

        // part1：总访问量
        if (data.part1) {
            document.getElementById('part1-total').textContent = data.part1.total || '-';
            document.getElementById('part1-compare').textContent = data.part1.compare || '-';
            const part1Change = document.getElementById('part1-change');
            part1Change.textContent = data.part1.percent_change ? `\u00A0\u00A0${data.part1.percent_change}%` : '-';
            part1Change.className = data.part1.percent_change >= 0 ?
                'result-value percent-positive' :
                'result-value percent-negative';

            if (data.part1.percent_change > 0) {
                $('.compare_up').show();
                $('#part1-change').css('color', '#15AD63');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part1.percent_change < 0) {
                $('.compare_up').show();
                $('#part1-change').css('color', '#DC2D65');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                part1Change.textContent = '\u00A0\u00A00%';
                $('#part1-change').css('color', '#7e797bff');
                $('.compare_up').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            }

            hideLoading('part1');
        }

        // part2：高峰与低谷时段
        if (data.part2) {
            document.getElementById('part2-peak').textContent = data.part2.peak_period || '-';
            document.getElementById('part2-low').textContent = data.part2.low_period || '-';
            hideLoading('part2');
        }

        // 填充摄像头统计数据
        if (data.part3) fillCameraStats('part3', data.part3);
        if (data.part4) fillCameraStats('part4', data.part4);
        if (data.part5) fillCameraStats('part5', data.part5);
        if (data.part6) fillCameraStats('part6', data.part6);

        // 填充区域统计数据
        if (data.part7) fillAreaStats('part7', data.part7);
        if (data.part8) fillAreaStats('part8', data.part8);
        if (data.part9) fillAreaStats('part9', data.part9);
        if (data.part10) fillAreaStats('part10', data.part10);

        // part11：性别分布
        if (data.part11) {
            document.getElementById('part11-male').textContent = data.part11.male.current || '-';
            const maleChange = document.getElementById('part11-male-change');
            maleChange.textContent = data.part11.male.percent_change ? `${data.part11.male.percent_change}%` : '-';
            if (data.part11.male.percent_change > 0) {
                $('.value_up1').show();
                $('#part11-male-change').css('color', '#15AD63');
                $('.value_up1').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.male.percent_change < 0) {
                $('.value_up1').show();
                $('#part11-male-change').css('color', '#DC2D65');
                $('.value_up1').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                maleChange.textContent = '0%';
                $('#part11-male-change').css('color', '#7e797bff');
                $('.value_up1').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            }

            document.getElementById('part11-female').textContent = data.part11.female.current || '-';
            const femaleChange = document.getElementById('part11-female-change');
            femaleChange.textContent = data.part11.female.percent_change ? `${data.part11.female.percent_change}%` : '-';
            if (data.part11.female.percent_change > 0) {
                $('.value_up2').show();
                $('#part11-female-change').css('color', '#15AD63');
                $('.value_up2').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.female.percent_change < 0) {
                $('.value_up2').show();
                $('#part11-female-change').css('color', '#DC2D65');
                $('.value_up2').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                femaleChange.textContent = '0%';
                $('#part11-female-change').css('color', '#7e797bff');
                $('.value_up2').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            }

            document.getElementById('part11-children').textContent = data.part11.children.current || '-';
            const childrenChange = document.getElementById('part11-children-change');
            childrenChange.textContent = data.part11.children.percent_change ? `${data.part11.children.percent_change}%` : '-';
            if (data.part11.children.percent_change > 0) {
                $('.value_up3').show();
                $('#part11-children-change').css('color', '#15AD63');
                $('.value_up3').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.children.percent_change < 0) {
                $('.value_up3').show();
                $('#part11-children-change').css('color', '#DC2D65');
                $('.value_up3').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                childrenChange.textContent = '0%';
                $('#part11-children-change').css('color', '#7e797bff');
                $('.value_up3').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            }

            document.getElementById('part11-unknown').textContent = data.part11.unknown.current || '-';
            const unknownChange = document.getElementById('part11-unknown-change');
            unknownChange.textContent = data.part11.unknown.percent_change ? `${data.part11.unknown.percent_change}%` : '-';
            if (data.part11.unknown.percent_change > 0) {
                $('.value_up4').show();
                $('#part11-unknown-change').css('color', '#15AD63');
                $('.value_up4').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part11.unknown.percent_change < 0) {
                $('.value_up4').show();
                $('#part11-unknown-change').css('color', '#DC2D65');
                $('.value_up4').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                unknownChange.textContent = '0%';
                $('#part11-unknown-change').css('color', '#7e797bff');
                $('.value_up4').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            }

            hideLoading('part11');
        }

    }

    function fillCameraStats(partId, stats) {
        document.getElementById(`${partId}-total`).textContent = stats.total || '-';
        document.getElementById(`${partId}-male`).textContent = stats.male_percent ? `${stats.male_percent}%` : '-';
        document.getElementById(`${partId}-female`).textContent = stats.female_percent ? `${stats.female_percent}%` : '-';
        document.getElementById(`${partId}-children`).textContent = stats.minor_percent ? `${stats.minor_percent}%` : '-';
        document.getElementById(`${partId}-unknown`).textContent = stats.unknown_percent ? `${stats.unknown_percent}%` : '-';
        document.getElementById(`${partId}-peak`).textContent = stats.peak_period || '-';
        document.getElementById(`${partId}-low`).textContent = stats.low_period || '-';
        hideLoading(partId);
    }

    function fillAreaStats(partId, stats) {
        document.getElementById(`${partId}-value`).textContent = stats.value || '0';
        document.getElementById(`${partId}-comparison`).textContent = stats.comparison || '-';
        const changeElement = document.getElementById(`${partId}-change`);
        changeElement.textContent = stats.percent_change ? `\u00A0\u00A0${stats.percent_change}%` : '-';
        changeElement.className = stats.percent_change >= 0 ?
            'result-value percent-positive' :
            'result-value percent-negative';

        if (stats.percent_change > 0) {
            if (partId === 'part7') {
                $('.comparison_up1').show();
                $('#part7-change').css('color', '#15AD63');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part8') {
                $('.comparison_up2').show();
                $('#part8-change').css('color', '#15AD63');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part9') {
                $('.comparison_up3').show();
                $('#part9-change').css('color', '#15AD63');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else {
                $('.comparison_up4').show();
                $('#part10-change').css('color', '#15AD63');
                $('.comparison_up4').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            }
        } else if (stats.percent_change < 0) {
            if (partId === 'part7') {
                $('.comparison_up1').show();
                $('#part7-change').css('color', '#DC2D65');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part8') {
                $('.comparison_up2').show();
                $('#part8-change').css('color', '#DC2D65');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part9') {
                $('.comparison_up3').show();
                $('#part9-change').css('color', '#DC2D65');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                $('.comparison_up4').show();
                $('#part10-change').css('color', '#DC2D65');
                $('.comparison_up4').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            }
        } else {
            changeElement.textContent = '\u00A0\u00A00%';
            if (partId === 'part7') {
                $('#part7-change').css('color', '#7e797bff');
                $('.comparison_up1').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            } else if (partId === 'part8') {
                $('#part8-change').css('color', '#7e797bff');
                $('.comparison_up2').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            } else if (partId === 'part9') {
                $('#part9-change').css('color', '#7e797bff');
                $('.comparison_up3').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
            } else {
                $('#part10-change').css('color', '#7e797bff');
                $('.comparison_up4').css('visibility', 'hidden'); // 使用 visibility 隐藏但保留占位
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

    // 获取数据并更新UI
    function getDataAndUpdateUI() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const refStartDate = refStartDateInput.value;
        const refEndDate = refEndDateInput.value;

        // 创建请求参数
        const params = {
            time_start: startTime,
            time_end: endTime,
            date_start: startDate + ' ' + startTime,
            date_end: endDate + ' ' + endTime,
            ref_date_start: refStartDate + ' ' + startTime,
            ref_date_end: refEndDate + ' ' + endTime,
        };

        // 获取并显示仪表板数据
        fetchDashboardData(params)
            .then(data => {
                displayResults(data);
            })
            .catch(error => {
                // 获取仪表板数据时出错
                console.error('Error occurred while fetching dashboard data:', error);

                // 处理错误情况
                for (let i = 1; i <= 11; i++) {
                    const card = document.getElementById(`part${i}`);
                    if (card) {
                        const resultValues = card.querySelectorAll('.result-value');
                        resultValues.forEach(value => {
                            // 加载失败
                            value.textContent = 'Failed to load data!';
                            value.classList.add('error');
                        });
                    }
                }
            });
    }

    // 更新时间段选择器
    function updateTimeSelectors() {
        const startDate = startDateInput ? startDateInput.value || defaultStartDate : defaultStartDate;
        const endDate = endDateInput ? endDateInput.value || defaultEndDate : defaultEndDate;

        fetchAllTime(startDate, endDate)
            .then(timeSlots => {

                // 保存当前选中的值
                const currentStartTime = startTimeInput.value;
                const currentEndTime = endTimeInput.value;

                // 清空并重新填充选项
                startTimeInput.innerHTML = '';
                endTimeInput.innerHTML = '';

                // 添加时间段选项
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

                // 恢复或设置默认值
                if (timeSlots.length > 0) {
                    // 尝试恢复之前的选择
                    if (currentStartTime && startTimeInput.querySelector(`option[value="${currentStartTime}"]`)) {
                        startTimeInput.value = currentStartTime;
                    } else {
                        startTimeInput.value = timeSlots[0].start;
                    }

                    // 更新结束时间选择器
                    updateEndTimeOptions();

                    // 尝试恢复之前的选择
                    if (currentEndTime && endTimeInput.querySelector(`option[value="${currentEndTime}"]`)) {
                        endTimeInput.value = currentEndTime;
                    } else if (timeSlots.length > 0) {
                        endTimeInput.value = timeSlots[0].end;
                    }
                }

                getDataAndUpdateUI();
            })
            .catch(error => {
                // 获取时间段时出错
                console.error('Error occurred while fetching time periods:', error);
                // 添加错误选项
                startTimeInput.innerHTML = '';
                endTimeInput.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                // 错误：无法加载时间段
                option.textContent = 'Error: Failed to load time periods!';
                startTimeInput.appendChild(option);
                endTimeInput.appendChild(option);
            });
    }

    // 更新结束时间选项
    function updateEndTimeOptions() {

        if (!startTimeInput || !endTimeInput) return;

        const selectedStart = startTimeInput.value;
        const endOptions = Array.from(endTimeInput.options);

        // 过滤出大于开始时间的选项
        const validEndOptions = endOptions.filter(option =>
            option.value > selectedStart || option.value === ""
        );

        // 更新结束时间下拉框
        endTimeInput.innerHTML = '';
        validEndOptions.forEach(option => {
            endTimeInput.appendChild(option);
        });

        // 自动选择第一个有效选项
        if (validEndOptions.length > 0) {
            endTimeInput.value = validEndOptions[0].value;
        }
    }

    // 初始化仪表板
    function initializeDashboard() {

        // 添加null检查
        if (!startDateInput || !endDateInput || !refStartDateInput || !refEndDateInput || !startTimeInput || !endTimeInput) {
            // 无法找到必要的DOM元素
            console.error("Unable to find required DOM elements!");
            return;
        }

        // 初始化时间段选择器
        updateTimeSelectors();

        // 添加事件监听器
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

    // 初始化仪表板图表函数
    function setCharts(data, type = 'monthly_current') {
        const canvas = document.getElementById("canvas_11");
        const ctx = canvas.getContext('2d');

        // 彻底销毁旧图表
        if (window.dashboardChart) {
            window.dashboardChart.destroy();
        }

        // 重置画布 - 解决图表残留问题
        const newCanvas = document.createElement('canvas');
        newCanvas.id = "canvas_11";
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        newCanvas.style.cssText = canvas.style.cssText;
        canvas.parentNode.replaceChild(newCanvas, canvas);

        // 根据类型生成动态标签
        const today = new Date();
        let labels = [];

        // 获取星期缩写
        function getDayAbbreviation(dayIndex) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[dayIndex];
        }

        // 完整月份名称
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        switch (type) {
            case 'weekly_current':
                // 从今天开始往前6天（共7天），最右边是今天
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
                // 从最近的周日开始往前6天（共7天），最右边是周日
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
                    // 当前周及前3周（共4周），最右边是本周
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
                    // 前4周（不含本周），最右边是上周
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
                // 当前月及前2个月（共3个月），最右边是本月
                for (let i = 2; i >= 0; i--) {
                    const d = new Date(today);
                    d.setMonth(today.getMonth() - i);
                    const year = d.getFullYear();
                    const monthName = monthNames[d.getMonth()];
                    labels.push(`${year} ${monthName}`);
                }
                break;

            case 'quarterly_historical':
                // 前3个月（不含本月），最右边是上个月
                for (let i = 3; i >= 1; i--) {
                    const d = new Date(today);
                    d.setMonth(today.getMonth() - i);
                    const year = d.getFullYear();
                    const monthName = monthNames[d.getMonth()];
                    labels.push(`${year} ${monthName}`);
                }
                break;

            case 'yearly_current':
                // 当前季度及前3个季度（共4个季度），最右边是本季度
                for (let i = 3; i >= 0; i--) {
                    const q = Math.floor(today.getMonth() / 3) + 1 - i;
                    const year = today.getFullYear() - (q <= 0 ? 1 : 0);
                    const quarter = q > 0 ? q : q + 4;
                    labels.push(`${year} Q${quarter}`);
                }
                break;

            case 'yearly_historical':
                // 前4个季度（不含本季度），最右边是上个季度
                for (let i = 4; i >= 1; i--) {
                    const q = Math.floor(today.getMonth() / 3) + 1 - i;
                    const year = today.getFullYear() - (q <= 0 ? 1 : 0);
                    const quarter = q > 0 ? q : q + 4;
                    labels.push(`${year} Q${quarter}`);
                }
                break;

            default:
                // 默认使用monthly_current格式
                for (let i = 3; i >= 0; i--) {
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay() - (7 * i));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);

                    labels.push(`Week ${i + 1} (${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()})`);
                }
                break;
        }

        // 创建多数据集
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

        // 创建新图表
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
                    enabled: false // 禁用提示框
                },
                hover: {
                    animationDuration: 0 // 禁用动画
                },
                legend: {
                    display: true,
                    position: 'right', // 图例位置配置
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
                                // if (index === values.length - 1) return '';
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
                }
            }
        });
    }

    // 创建加载提示
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

    // 页面加载时只请求一次 Weekly Footfall Distribution Overal 数据
    fetch('/api/footfall-distribution')
        .then(res => res.json())
        .then(data => {
            window.footfallDistributionData = data;
            setCharts(data, 'monthly_current');
            // 数据加载完成后移除加载提示
            loadingMessage.remove();
        })
        .catch(error => {
            console.error('Error loading Monthly Footfall Distribution Overal data:', error);
            loadingMessage.textContent = "Failed to load data.";
            loadingMessage.style.color = "#DC2D65";
        });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            // 切换样式
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 切换数据
            if (!window.footfallDistributionData) return; // 确保数据已加载
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

    // 初始化仪表板
    initializeDashboard();

    var btn = document.getElementById('downloadPdfBtn');
    if (btn) {
        btn.onclick = function () {
            var element = document.body;
            // 获取今天日期
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
                // jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' }
                // 自定义宽高（单位mm）：format: [420, 297]
                jsPDF: { unit: 'mm', format: [380, 500], orientation: 'landscape' }
            };
            html2pdf().set(opt).from(element).save();
        }
    }

    // 创建图片弹出层
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

    // 添加点击事件监听器
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

    // 关闭按钮功能
    document.querySelector('.close-modal').addEventListener('click', function () {
        const modal = document.querySelector('.camera-modal');
        modal.style.display = 'none';
    });

    // 点击背景关闭
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            const modal = document.querySelector('.camera-modal');
            modal.style.display = 'none';
        }
    });

    // ESC键关闭
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            const modal = document.querySelector('.camera-modal');
            modal.style.display = 'none';
        }
    });
});
