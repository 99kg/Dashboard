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
                console.log('最后登录时间已更新');
                // 更新页面显示的最后登录时间
                document.getElementById('lastLoginDisplay').textContent = data.new_last_login;
            }
        })
        .catch(error => {
            console.error('更新最后登录时间时出错:', error);
        });
}

// dashboard.js - 智能分析仪表板脚本
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

    let dashboardChart = null;

    // 获取DOM元素
    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const refStartDateInput = document.getElementById('refStartDate');
    const refEndDateInput = document.getElementById('refEndDate');

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
                value.textContent = '加载中...';
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
                    throw new Error('网络响应异常');
                }
                return response.json();
            })
            .catch(error => {
                console.error('获取时间段时出错:', error);
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
                    throw new Error('网络响应异常');
                }
                return response.json();
            })
            .catch(error => {
                console.error('获取仪表板数据时出错:', error);
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
                $('#part1-change').css('color', '#15AD63');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part1.percent_change < 0) {
                $('#part1-change').css('color', '#DC2D65');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                part1Change.textContent = '';
                $('.compare_up').hide();
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
            maleChange.className = data.part11.male.percent_change >= 0 ?
                'result-value percent-positive' : 'result-value percent-negative';

            document.getElementById('part11-female').textContent = data.part11.female.current || '-';
            const femaleChange = document.getElementById('part11-female-change');
            femaleChange.textContent = data.part11.female.percent_change ? `${data.part11.female.percent_change}%` : '-';
            femaleChange.className = data.part11.female.percent_change >= 0 ?
                'result-value percent-positive' : 'result-value percent-negative';

            document.getElementById('part11-children').textContent = data.part11.children.current || '-';
            const childrenChange = document.getElementById('part11-children-change');
            childrenChange.textContent = data.part11.children.percent_change ? `${data.part11.children.percent_change}%` : '-';
            childrenChange.className = data.part11.children.percent_change >= 0 ?
                'result-value percent-positive' : 'result-value percent-negative';

            hideLoading('part11');
        }

        // 更新Weekly Footfall Distribution Overal区域
        setCharts(data.part12);

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
        document.getElementById(`${partId}-value`).textContent = stats.value || '-';
        document.getElementById(`${partId}-comparison`).textContent = stats.comparison || '-';
        const changeElement = document.getElementById(`${partId}-change`);
        changeElement.textContent = stats.percent_change ? `\u00A0\u00A0${stats.percent_change}%` : '-';
        changeElement.className = stats.percent_change >= 0 ?
            'result-value percent-positive' :
            'result-value percent-negative';

        if (stats.percent_change > 0) {
            if (partId === 'part7') {
                $('#part7-change').css('color', '#15AD63');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part8') {
                $('#part8-change').css('color', '#15AD63');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part9') {
                $('#part9-change').css('color', '#15AD63');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else {
                $('#part10-change').css('color', '#15AD63');
                $('.comparison_up4').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            }
        } else if (stats.percent_change < 0) {
            if (partId === 'part7') {
                $('#part7-change').css('color', '#DC2D65');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part8') {
                $('#part8-change').css('color', '#DC2D65');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part9') {
                $('#part9-change').css('color', '#DC2D65');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                $('#part10-change').css('color', '#DC2D65');
                $('.comparison_up4').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            }
        } else {
            changeElement.textContent = '';
            if (partId === 'part7') {
                $('.comparison_up1').hide();
            } else if (partId === 'part8') {
                $('.comparison_up2').hide();
            } else if (partId === 'part9') {
                $('.comparison_up3').hide();
            } else {
                $('.comparison_up4').hide();
            }
        }

        var arr = [
            { "product_name_en": "Male", "count_pauchase": stats.male },
            { "product_name_en": "Female", "count_pauchase": stats.female },
            { "product_name_en": "Unknown", "count_pauchase": stats.unknown }
        ];
        var a = new Array();
        var b = new Array();
        for (var i = 0; i < arr.length; i++) {
            a.push(arr[i].product_name_en)
            b.push(arr[i].count_pauchase)
        }

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
                            'rgba(255, 122, 147, 1)'
                        ],
                        borderColor: [
                            'rgba(218, 18, 59, 1)',
                            'rgba(245, 97, 126, 1)',
                            'rgba(255, 122, 147, 1)'
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
                            'rgba(103, 232, 232, 1)'
                        ],
                        borderColor: [
                            'rgba(19, 196, 196, 1)',
                            'rgba(74, 177, 177, 1)',
                            'rgba(103, 232, 232, 1)'
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
                console.error('获取仪表板数据时出错:', error);
                // 处理错误情况
                for (let i = 1; i <= 11; i++) {
                    const card = document.getElementById(`part${i}`);
                    if (card) {
                        const resultValues = card.querySelectorAll('.result-value');
                        resultValues.forEach(value => {
                            value.textContent = '加载失败';
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
                // 添加null检查
                if (startTimeInput) startTimeInput.innerHTML = '';
                if (endTimeInput) endTimeInput.innerHTML = '';

                // 保存当前选中的值
                const currentStartTime = startTimeInput.value;
                const currentEndTime = endTimeInput.value;

                // 清空下拉框
                if (startTimeInput) {
                    startTimeInput.innerHTML = '';
                }
                if (endTimeInput) {
                    endTimeInput.innerHTML = '';
                }

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
                console.error('获取时间段时出错:', error);
                // 添加错误选项
                startTimeInput.innerHTML = '';
                endTimeInput.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '错误：无法加载时间段';
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
            console.error("无法找到必要的DOM元素");
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

        endDateInput.addEventListener('change', function () {
            updateTimeSelectors();
        });

        refStartDateInput.addEventListener('change', function () {
            getDataAndUpdateUI();
        });

        refEndDateInput.addEventListener('change', function () {
            getDataAndUpdateUI();
        });

        startTimeInput.addEventListener('change', function () {
            updateEndTimeOptions();
            getDataAndUpdateUI();
        });

        endTimeInput.addEventListener('change', function () {
            getDataAndUpdateUI();
        });
    }

    function showXAxisLabels(type) {
        document.querySelectorAll('.xaxis-labels').forEach(div => div.style.display = 'none');
        if (type === 'weekly') {
            document.getElementById('xaxis-weekly').style.display = '';
        } else if (type === 'monthly') {
            document.getElementById('xaxis-monthly').style.display = '';
        } else if (type === 'quarterly') {
            document.getElementById('xaxis-quarterly').style.display = '';
        } else if (type === 'yearly') {
            document.getElementById('xaxis-yearly').style.display = '';
        }
    }

    // 初始化仪表板
    function setCharts(data, type = 'weekly_current') {
        const container = document.getElementById('chart-container');
        const ctx = document.getElementById("canvas_11");

        // 完全移除旧图表（物理销毁）
        if (window.dashboardChart) {
            window.dashboardChart.destroy();
        }

        // 物理替换canvas元素 - 关键步骤
        const newCanvas = document.createElement('canvas');
        newCanvas.id = "canvas_11";
        newCanvas.height = ctx.height;
        newCanvas.width = ctx.width;
        newCanvas.style.cssText = ctx.style.cssText;
        ctx.parentNode.replaceChild(newCanvas, ctx);

        // 根据类型解析数据周期
        const [period, time] = type.split('_');

        // 映射UI数据到Chart.js格式
        const periods = {
            weekly: {
                labels: ['M', 'T', 'W', 'Tr', 'Fr', 'St', 'S'],
                data: [
                    data[type].unknown,
                    data[type].male,
                    data[type].female,
                    data[type].children
                ],
                maxBarThickness: 40
            },
            monthly: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                data: [
                    data[type].unknown,
                    data[type].male,
                    data[type].female,
                    data[type].children
                ],
                maxBarThickness: 20
            },
            quarterly: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                data: [
                    data[type].unknown,
                    data[type].male,
                    data[type].female,
                    data[type].children
                ],
                maxBarThickness: 50
            },
            yearly: {
                labels: ['Y1', 'Y2', 'Y3', 'Y4'],
                data: [
                    data[type].unknown,
                    data[type].male,
                    data[type].female,
                    data[type].children
                ],
                maxBarThickness: 50
            }
        };

        // 创建多数据集
        const datasets = [
            {
                label: 'Unknown',
                data: periods[period].data[0],
                backgroundColor: '#DC2D65',
                maxBarThickness: periods[period].maxBarThickness
            },
            {
                label: 'Male',
                data: periods[period].data[1],
                backgroundColor: '#5D4EB5',
                maxBarThickness: periods[period].maxBarThickness
            },
            {
                label: 'Female',
                data: periods[period].data[2],
                backgroundColor: '#15AD63',
                maxBarThickness: periods[period].maxBarThickness
            },
            {
                label: 'Children',
                data: periods[period].data[3],
                backgroundColor: '#24C4EF',
                maxBarThickness: periods[period].maxBarThickness
            }
        ];

        // 创建新图表
        window.dashboardChart = new Chart(newCanvas, {
            type: 'bar',
            data: {
                labels: periods[period].labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                // 动态调整Y轴标签格式
                                return value > 1000 ?
                                    (value / 1000).toFixed(1) + 'k' :
                                    value;
                            }
                        }
                    }
                }
            }
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            // 切换样式
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 切换数据
            if (!window.dashboardData) return; // 确保数据已加载
            switch (btn.id) {
                case 'historical-weekly-btn':
                    setCharts(window.dashboardData.part12, 'weekly_historical');
                    showXAxisLabels('weekly');
                    break;
                case 'historical-monthly-btn':
                    setCharts(window.dashboardData.part12, 'monthly_historical');
                    showXAxisLabels('monthly');
                    break;
                case 'historical-quarterly-btn':
                    setCharts(window.dashboardData.part12, 'quarterly_historical');
                    showXAxisLabels('quarterly');
                    break;
                case 'historical-yearly-btn':
                    setCharts(window.dashboardData.part12, 'yearly_historical');
                    showXAxisLabels('yearly');
                    break;
                case 'current-weekly-btn':
                    setCharts(window.dashboardData.part12, 'weekly_current');
                    showXAxisLabels('weekly');
                    break;
                case 'current-monthly-btn':
                    setCharts(window.dashboardData.part12, 'monthly_current');
                    showXAxisLabels('monthly');
                    break;
                case 'current-quarterly-btn':
                    setCharts(window.dashboardData.part12, 'quarterly_current');
                    showXAxisLabels('quarterly');
                    break;
                case 'current-yearly-btn':
                    setCharts(window.dashboardData.part12, 'yearly_current');
                    showXAxisLabels('yearly');
                    break;
            }
        });
    });

    // 初始化仪表板
    initializeDashboard();
});
