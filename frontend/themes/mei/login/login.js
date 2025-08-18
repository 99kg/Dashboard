document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    // 动画效果：表单进入
    document.querySelector('.login-container').style.opacity = '0';
    document.querySelector('.login-container').style.transform = 'translateY(30px)';
    setTimeout(() => {
        document.querySelector('.login-container').style.transition = 'all 0.6s ease';
        document.querySelector('.login-container').style.opacity = '1';
        document.querySelector('.login-container').style.transform = 'translateY(0)';
    }, 100);
    
    // 表单提交处理
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // 清除之前的错误消息
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        
        // 简单的前端验证
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }
        
        // 添加加载状态
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Authenticating...';
        submitBtn.disabled = true;
        
        try {
            // 发送登录请求到后端
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // 登录成功 - 添加成功动画
                loginForm.classList.add('success');
                setTimeout(() => {
                    // 重定向到仪表板
                    window.location.href = '/dashboard';
                }, 800);
            } else {
                // 显示错误信息
                showError(data.error || 'Login failed. Please try again.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Network error. Please try again.');
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
    
    // 显示错误消息的函数
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // 添加错误动画
        errorMessage.style.animation = 'none';
        setTimeout(() => {
            errorMessage.style.animation = 'shake 0.5s';
        }, 10);
    }
    
    // 为错误消息添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
        }
    `;
    document.head.appendChild(style);
});