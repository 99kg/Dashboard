


//加载选择区间滑动搜索 - 电脑版
function load_rangenoUiSlider_pc(){
    noUiSlider.create(range_pc, {
        start: [0, 100000], // Handle start position
        step: 1, // Slider moves in increments of '10'
        margin: 0, // Handles must be more than '20' apart
        connect: true, // Display a colored bar between the handles
        direction: 'ltr', // Put '0' at the bottom of the slider
        orientation: 'horizontal', // Orient the slider vertically:vertical:
        behaviour: 'tap-drag', // Move handle on tap, bar is draggable
        range: { // Slider can select '0' to '100'
            'min': 0,
            'max': 24
        },
//		    pips: { // 配置刻度
//		        mode: 'steps',// 'range', 'values', 'positions', 'steps' 等模式之一
//		        values: 5, // 如果使用 'count' 模式，则表示刻度的数量
//		        density: 2 // 控制刻度之间的密度
//		    }
    });

    // When the slider value changes, update the input and span
    range_pc.noUiSlider.on('update', function( values, handle ) {
        if(handle == 0){
            $('#tuitionfee_min').val(parseInt(values[handle]));
            $('#tuitionfee_min_show').html(parseInt(values[handle]));
        }else if(handle == 1){
            $('#tuitionfee_max').val(parseInt(values[handle]));
            $('#tuitionfee_max_show').html(parseInt(values[handle]));
        }
    });

    range_pc.noUiSlider.on('end', function( values, handle ) {
        
    });

    // When the input changes, set the slider value
    //range_pc.noUiSlider.set([null, this.value]);
}

$(document).ready(function (){
    var range_pc = document.getElementById('range_pc');
    load_rangenoUiSlider_pc();//加载选择区间滑动搜索 - 电脑版








    var a_3 = new Array();
    		var b_3 = new Array();
            var c_3 = new Array();


            a_3.push('');
			b_3.push(0);
            c_3.push(0);

    		a_3.push('');
			b_3.push(0);
            c_3.push(2);

            a_3.push('');
			b_3.push(0);
            c_3.push(4);

            a_3.push('');
			b_3.push(0);
            c_3.push(6);



            //星期一
            a_3.push('');
			b_3.push(16);
            c_3.push(8);

            a_3.push('');
			b_3.push(25);
            c_3.push(10);

            a_3.push('');
			b_3.push(8);
            c_3.push(12);

            a_3.push('');
			b_3.push(17);
            c_3.push(14);


            a_3.push('');
			b_3.push(0);
            c_3.push(14);

    		a_3.push('');
			b_3.push(0);
            c_3.push(12);

            a_3.push('');
			b_3.push(0);
            c_3.push(10);

            a_3.push('');
			b_3.push(0);
            c_3.push(11);

            a_3.push('');
			b_3.push(0);
            c_3.push(12);

    		a_3.push('');
			b_3.push(0);
            c_3.push(13);

            a_3.push('');
			b_3.push(0);
            c_3.push(14);

            a_3.push('');
			b_3.push(0);
            c_3.push(15);

            //星期二
    		a_3.push('');
			b_3.push(16);
            c_3.push(16);

            a_3.push('');
			b_3.push(25);
            c_3.push(17);

            a_3.push('');
			b_3.push(8);
            c_3.push(18);

            a_3.push('');
			b_3.push(17);
            c_3.push(19);




            a_3.push('');
			b_3.push(0);
            c_3.push(17);

    		a_3.push('');
			b_3.push(0);
            c_3.push(16);

            a_3.push('');
			b_3.push(0);
            c_3.push(16);

            a_3.push('');
			b_3.push(0);
            c_3.push(15);
            
            a_3.push('');
			b_3.push(0);
            c_3.push(14);

    		a_3.push('');
			b_3.push(0);
            c_3.push(13);

            a_3.push('');
			b_3.push(0);
            c_3.push(12);

            a_3.push('');
			b_3.push(0);
            c_3.push(11);

    		//星期三
    		a_3.push('');
			b_3.push(16);
            c_3.push(10);

            a_3.push('');
			b_3.push(25);
            c_3.push(9);

            a_3.push('');
			b_3.push(8);
            c_3.push(9);

            a_3.push('');
			b_3.push(17);
            c_3.push(12);




            a_3.push('');
			b_3.push(0);
            c_3.push(14);

    		a_3.push('');
			b_3.push(0);
            c_3.push(17);

            a_3.push('');
			b_3.push(0);
            c_3.push(20);

            a_3.push('');
			b_3.push(0);
            c_3.push(24);
            
            a_3.push('');
			b_3.push(0);
            c_3.push(28);

    		a_3.push('');
			b_3.push(0);
            c_3.push(27);

            a_3.push('');
			b_3.push(0);
            c_3.push(26);

            a_3.push('');
			b_3.push(0);
            c_3.push(28);

    		//星期四
    		a_3.push('');
			b_3.push(16);
            c_3.push(24);

            a_3.push('');
			b_3.push(25);
            c_3.push(20);

            a_3.push('');
			b_3.push(8);
            c_3.push(16);

            a_3.push('');
			b_3.push(17);
            c_3.push(15);




            a_3.push('');
			b_3.push(0);
            c_3.push(15);

    		a_3.push('');
			b_3.push(0);
            c_3.push(14);

            a_3.push('');
			b_3.push(0);
            c_3.push(13);

            a_3.push('');
			b_3.push(0);
            c_3.push(13);
            
            a_3.push('');
			b_3.push(0);
            c_3.push(12);

    		a_3.push('');
			b_3.push(0);
            c_3.push(10);

            a_3.push('');
			b_3.push(0);
            c_3.push(9);

            a_3.push('');
			b_3.push(0);
            c_3.push(9);

    		//星期五
    		a_3.push('');
			b_3.push(16);
            c_3.push(8);

            a_3.push('');
			b_3.push(25);
            c_3.push(5);

            a_3.push('');
			b_3.push(8);
            c_3.push(14);

            a_3.push('');
			b_3.push(17);
            c_3.push(15);




            a_3.push('');
			b_3.push(0);
            c_3.push(17);
            
    		a_3.push('');
			b_3.push(0);
            c_3.push(20);

            a_3.push('');
			b_3.push(0);
            c_3.push(22);

            a_3.push('');
			b_3.push(0);
            c_3.push(26);
            
            a_3.push('');
			b_3.push(0);
            c_3.push(24);

    		a_3.push('');
			b_3.push(0);
            c_3.push(23);

            a_3.push('');
			b_3.push(0);
            c_3.push(19);

            a_3.push('');
			b_3.push(0);
            c_3.push(17);

    		//星期六
    		a_3.push('');
			b_3.push(16);
            c_3.push(14);

            a_3.push('');
			b_3.push(25);
            c_3.push(12);

            a_3.push('');
			b_3.push(8);
            c_3.push(18);

            a_3.push('');
			b_3.push(17);
            c_3.push(14);


			a_3.push('');
			b_3.push(0);
            c_3.push(10);

    		a_3.push('');
			b_3.push(0);
            c_3.push(10);

            a_3.push('');
			b_3.push(0);
            c_3.push(7);

            a_3.push('');
			b_3.push(0);
            c_3.push(8);
            
            a_3.push('');
			b_3.push(0);
            c_3.push(11);

    		a_3.push('');
			b_3.push(0);
            c_3.push(15);

            a_3.push('');
			b_3.push(0);
            c_3.push(20);

            a_3.push('');
			b_3.push(0);
            c_3.push(23);

    		//星期日
    		a_3.push('');
			b_3.push(16);
            c_3.push(26);

            a_3.push('');
			b_3.push(25);
            c_3.push(21);

            a_3.push('');
			b_3.push(8);
            c_3.push(18);

            a_3.push('');
			b_3.push(17);
            c_3.push(14);

			


			a_3.push('');
			b_3.push(0);
            c_3.push(13);

    		a_3.push('');
			b_3.push(0);
            c_3.push(12);

            a_3.push('');
			b_3.push(0);
            c_3.push(8);

            a_3.push('');
			b_3.push(0);
            c_3.push(0);
			
    		
    		var ctx_11 = document.getElementById("canvas_11");
    		var myChart_11 = new Chart(ctx_11, {
    		    type: 'bar',
    		    data: {
    		        labels: a_3,
    		        datasets: [{
    		            label: '',
    		            data: b_3,
    		            backgroundColor: [
    		                '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',
    		            ],
    		            borderColor: [
                        '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',

                            '#DC2D65',
    		                '#5D4EB5',
    		                '#15AD63',
    		                '#24C4EF',
    		            ],
    		            borderWidth: 1,
                        borderJoinStyle: 'round', // 设置线条连接处为圆角
                        borderCapStyle: 'round', // 线条端点也设为圆角
                        cubicInterpolationMode: 'monotone', // 使用更平滑的插值模式
                        tension: 0.4, // 配合使用张力值
    		        },
                    // 折线图数据集
                    {
                        label: '折线图数据',
                        type: 'line', // 指定类型为折线图
                        data: c_3,
                        backgroundColor: '#BABABA',
                        borderColor: '#BABABA',
                        borderWidth: 2,
                        fill: false // 折线图通常不填充
                    }]
    		    },
    		    options: {
    		    	legend: {
    		    	    display: false
    		    	},
			        scales: {
			             xAxes: [
                            {
                                stacked: true
                            }
                        ],
                        
                        yAxes: [
                            {
                                stacked: true
                            }
                        ]
			        }
			    }
//     		    options: {
//     		    	legend: {
//     		    	    display: false
//     		    	},
//     		        scales: {
//     		            y: {
//     		                beginAtZero: true // 设置y轴从0开始
//     		            }
//     		        }
//     		    }
    		});







    



    var arr = [
        {"product_name_en":"Male", "count_pauchase": 3000}, 
        {"product_name_en":"Female", "count_pauchase": 1604}, 
        {"product_name_en":"Children", "count_pauchase": 624}
    ];
    var a = new Array();
    var b = new Array();
    for(var i = 0; i < arr.length; i++){
        a.push(arr[i].product_name_en)
        b.push(arr[i].count_pauchase)
    }
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



    var arr = [
        {"product_name_en":"Male", "count_pauchase": 3000}, 
        {"product_name_en":"Female", "count_pauchase": 1604}, 
        {"product_name_en":"Children", "count_pauchase": 624}
    ];
    var a = new Array();
    var b = new Array();
    for(var i = 0; i < arr.length; i++){
        a.push(arr[i].product_name_en)
        b.push(arr[i].count_pauchase)
    }
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

    var arr = [
        {"product_name_en":"Male", "count_pauchase": 3000}, 
        {"product_name_en":"Female", "count_pauchase": 1604}, 
        {"product_name_en":"Children", "count_pauchase": 624}
    ];
    var a = new Array();
    var b = new Array();
    for(var i = 0; i < arr.length; i++){
        a.push(arr[i].product_name_en)
        b.push(arr[i].count_pauchase)
    }
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

    var arr = [
        {"product_name_en":"Male", "count_pauchase": 3000}, 
        {"product_name_en":"Female", "count_pauchase": 1604}, 
        {"product_name_en":"Children", "count_pauchase": 624}
    ];
    var a = new Array();
    var b = new Array();
    for(var i = 0; i < arr.length; i++){
        a.push(arr[i].product_name_en)
        b.push(arr[i].count_pauchase)
    }
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
})