$(document).ready(function() {
    // 设置默认日期
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    $('#dateStart').val(formatDate(weekAgo));
    $('#dateEnd').val(formatDate(today));
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(today.getDate() - 14);
    const weekBeforeLast = new Date();
    weekBeforeLast.setDate(today.getDate() - 8);
    
    $('#refDateStart').val(formatDate(twoWeeksAgo));
    $('#refDateEnd').val(formatDate(weekBeforeLast));
    
    // 获取摄像头列表
    fetchCameraList();
    
    // 获取数据按钮事件
    $('#fetchDataBtn').click(fetchData);
    
    // 时间选择器事件
    $('.time-btn').click(function() {
        $('.time-btn').removeClass('active').addClass('inactive');
        $(this).removeClass('inactive').addClass('active');
        // 这里可以添加根据选择的时间范围更新图表的逻辑
    });
});

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fetchCameraList() {
    showLoading(true);
    
    $.ajax({
        url: '/api/cameras',
        type: 'GET',
        success: function(cameras) {
            const cameraSelect = $('#cameraSelect');
            cameraSelect.empty();
            cameraSelect.append('<option value="">-- Select Camera --</option>');
            
            cameras.forEach(function(camera) {
                cameraSelect.append($('<option>', {
                    value: camera,
                    text: camera
                }));
            });
        },
        error: function() {
            alert('Failed to fetch camera list');
        },
        complete: function() {
            showLoading(false);
        }
    });
}

function fetchData() {
    const cameraName = $('#cameraSelect').val();
    const dateStart = $('#dateStart').val();
    const dateEnd = $('#dateEnd').val();
    const refDateStart = $('#refDateStart').val();
    const refDateEnd = $('#refDateEnd').val();
    
    if (!cameraName || !dateStart || !dateEnd || !refDateStart || !refDateEnd) {
        alert('Please fill all fields');
        return;
    }
    
    showLoading(true);
    
    $.ajax({
        url: '/api/dashboard',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            camera_name: cameraName,
            date_start: dateStart,
            date_end: dateEnd,
            ref_date_start: refDateStart,
            ref_date_end: refDateEnd
        }),
        success: function(data) {
            updateDashboard(data);
        },
        error: function() {
            alert('Failed to fetch data');
        },
        complete: function() {
            showLoading(false);
        }
    });
}

function updateDashboard(data) {
    // 更新总览数据
    $('#totalVisitors').text(data.overview.total_visitors);
    $('#referenceVisitors').text(data.overview.reference_visitors);
    
    const percentage = data.overview.percent_change;
    $('#comparisonPercent').text(percentage + '%');
    
    // 更新趋势图标
    if (percentage > 0) {
        $('#comparisonPercent').css('color', '#15AD63');
        $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
    } else if (percentage < 0) {
        $('#comparisonPercent').css('color', '#DC2D65');
        $('.compare_up').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
    } else {
        $('.compare_up').hide();
    }
    
    // 更新高峰和低谷时段
    $('#peakPeriod').text(data.overview.peak_period);
    $('#lowPeriod').text(data.overview.low_period);
    
    // 更新最后更新时间
    const now = new Date();
    $('#lastUpdateTime').text(now.toLocaleString());
    
    // 更新摄像头数据
    updateCameraData('a6', data.cameras.A6);
    updateCameraData('a2', data.cameras.A2);
    updateCameraData('a3', data.cameras.A3);
    updateCameraData('a4', data.cameras.A4);
    
    // 更新区域数据
    updateAreaData('coldStorage', data.areas.cold_storage);
    updateAreaData('a8', data.areas.a8);
    updateAreaData('canteen', data.areas.canteen);
    updateAreaData('secondFloor', data.areas.second_floor);
    
    // 更新性别数据
    updateGenderData(data.overview);
    
    // 更新图表
    updateCharts(data);
}

function updateCameraData(prefix, data) {
    $('#' + prefix + 'Total').text(data.total);
    $('#' + prefix + 'Male').text(data.male_percent + '%');
    $('#' + prefix + 'Female').text(data.female_percent + '%');
    $('#' + prefix + 'Child').text(data.minor_percent + '%');
    $('#' + prefix + 'Unknown').text(data.unknown_gender_percent + '%');
}

function updateAreaData(prefix, data) {
    $('#' + prefix + 'Value').text(data.value);
    $('#' + prefix + 'Ref').text(data.ref_value);
    
    const percentage = data.percent_change;
    $('#' + prefix + 'Percent').text(percentage + '%');
    
    if (percentage > 0) {
        $('#' + prefix + 'Percent').css('color', '#15AD63');
        $('.comparison_up').attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
    } else if (percentage < 0) {
        $('#' + prefix + 'Percent').css('color', '#DC2D65');
        $('.comparison_up').attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
    } else {
        $('.comparison_up').hide();
    }
}

function updateGenderData(data) {
    $('#maleTotal').text(data.male_total);
    $('#femaleTotal').text(data.female_total);
    $('#childTotal').text(data.minor_total);
    
    $('#malePercent').text(data.male_percent_change + '%');
    $('#femalePercent').text(data.female_percent_change + '%');
    $('#childPercent').text(data.minor_percent_change + '%');
    
    // 更新趋势图标
    updateTrendIcon('male', data.male_percent_change);
    updateTrendIcon('female', data.female_percent_change);
    updateTrendIcon('child', data.minor_percent_change);
}

function updateTrendIcon(prefix, percentage) {
    const icon = $('#' + prefix + 'Trend');
    if (percentage > 0) {
        icon.attr('src', './themes/default/images/icon_sanjiaoxing_top_green.png');
        icon.removeClass('value_do').addClass('value_up');
    } else if (percentage < 0) {
        icon.attr('src', './themes/default/images/icon_sanjiaoxing_bottom_red.png');
        icon.removeClass('value_up').addClass('value_do');
    } else {
        icon.hide();
    }
}

function updateCharts(data) {
    // 更新canvas_1图表
    updateChart('canvas_1', {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Current Week',
            data: [1200, 1900, 1500, 1800, 2200, 2500, 2000],
            backgroundColor: 'rgba(53, 162, 235, 0.5)'
        }, {
            label: 'Previous Week',
            data: [1000, 1700, 1300, 1600, 2000, 2300, 1800],
            backgroundColor: 'rgba(255, 99, 132, 0.5)'
        }]
    });
    
    // 更新其他图表类似...
    updateChart('canvas_11', {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Male',
            data: [500, 700, 600, 800, 900, 1000, 850],
            backgroundColor: '#5D4EB5'
        }, {
            label: 'Female',
            data: [400, 600, 500, 700, 800, 900, 750],
            backgroundColor: '#15AD63'
        }, {
            label: 'Children',
            data: [300, 400, 350, 450, 500, 600, 550],
            backgroundColor: '#24C4EF'
        }, {
            label: 'Unknown',
            data: [100, 150, 120, 180, 200, 250, 220],
            backgroundColor: '#DC2D65'
        }]
    });
}

function updateChart(canvasId, chartData) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // 如果已有图表实例，先销毁
    if (window[canvasId + 'Chart']) {
        window[canvasId + 'Chart'].destroy();
    }
    
    // 创建新图表
    window[canvasId + 'Chart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: chartData.title || 'Chart'
                }
            },
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}

function showLoading(show) {
    if (show) {
        $('#loadingOverlay').show();
    } else {
        $('#loadingOverlay').hide();
    }
}