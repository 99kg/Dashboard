// dashboard.js - 智能分析仪表板脚本
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOMContentLoaded triggered");
    console.log("Location element:", document.getElementById('location'));
    console.log("Part1-total element:", document.getElementById('part1-total'));

    // 获取DOM元素
    const locationSelect = document.getElementById('location');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const refStartDateInput = document.getElementById('refStartDate');
    const refEndDateInput = document.getElementById('refEndDate');

    // 设置默认日期（昨天和前天）
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // 格式化日期为YYYY-MM-DD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 设置默认日期
    startDateInput.value = formatDate(yesterday);
    endDateInput.value = formatDate(yesterday);
    refStartDateInput.value = formatDate(twoDaysAgo);
    refEndDateInput.value = formatDate(twoDaysAgo);

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

    // 从后端获取摄像头列表
    function fetchCameras() {
        return fetch('/api/cameras')
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应异常');
                }
                return response.json();
            })
            .catch(error => {
                console.error('获取摄像头时出错:', error);
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
        // 部分1：总访问量
        if (data.part1) {
            document.getElementById('part1-total').textContent = data.part1.total || '-';
            document.getElementById('part1-compare').textContent = data.part1.compare || '-';
            const part1Change = document.getElementById('part1-change');
            part1Change.textContent = data.part1.percent_change ? `\u00A0\u00A0${data.part1.percent_change}%` : '-';
            part1Change.className = data.part1.percent_change >= 0 ?
                'result-value percent-positive' :
                'result-value percent-negative';

            if (data.part1.percent_change > 0) {
                $('#comparisonPercent').css('color', '#15AD63');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (data.part1.percent_change < 0) {
                $('#comparisonPercent').css('color', '#DC2D65');
                $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                part1Change.textContent = '';
                $('.compare_up').hide();
            }

            hideLoading('part1');
        }

        // 部分2：高峰与低谷时段
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

        // 部分11：性别分布
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
                $('#comparisonPercent').css('color', '#15AD63');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part8') {
                $('#comparisonPercent').css('color', '#15AD63');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else if (partId === 'part9') {
                $('#comparisonPercent').css('color', '#15AD63');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            } else {
                $('#comparisonPercent').css('color', '#15AD63');
                $('.comparison_up4').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
            }
        } else if (stats.percent_change < 0) {
            if (partId === 'part7') {
                $('#comparisonPercent').css('color', '#DC2D65');
                $('.comparison_up1').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part8') {
                $('#comparisonPercent').css('color', '#DC2D65');
                $('.comparison_up2').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else if (partId === 'part9') {
                $('#comparisonPercent').css('color', '#DC2D65');
                $('.comparison_up3').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
            } else {
                $('#comparisonPercent').css('color', '#DC2D65');
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

        hideLoading(partId);
    }

    // 获取数据并更新UI
    function getDataAndUpdateUI() {
        const location = locationSelect.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const refStartDate = refStartDateInput.value;
        const refEndDate = refEndDateInput.value;

        if (!location || !startDate || !endDate || !refStartDate || !refEndDate) {
            console.warn('请填写所有字段');
            return;
        }

        // 创建请求参数
        const params = {
            camera_name: location,
            date_start: startDate + ' 00:00:00',
            date_end: endDate + ' 23:59:59',
            ref_date_start: refStartDate + ' 00:00:00',
            ref_date_end: refEndDate + ' 23:59:59'
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

    // 初始化摄像头选择器并获取初始数据
    function initializeDashboard() {
        fetchCameras()
            .then(cameras => {
                // 清空加载中消息
                locationSelect.innerHTML = '';

                // 添加摄像头选项
                cameras.forEach(camera => {
                    const option = document.createElement('option');
                    option.value = camera;
                    option.textContent = camera;
                    locationSelect.appendChild(option);
                });

                // 默认选择第一个摄像头
                if (cameras.length > 0) {
                    locationSelect.value = cameras[0];
                    // 触发初始数据加载
                    getDataAndUpdateUI();
                }
            })
            .catch(error => {
                console.error('获取摄像头时出错:', error);
                // 添加错误选项
                locationSelect.innerHTML = '';
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '错误：无法加载位置';
                locationSelect.appendChild(option);
            });
    }

    // 为所有输入元素添加事件监听器
    [locationSelect, startDateInput, endDateInput, refStartDateInput, refEndDateInput].forEach(input => {
        input.addEventListener('change', function () {
            getDataAndUpdateUI();
        });
    });

    // 初始化仪表板
    initializeDashboard();

});