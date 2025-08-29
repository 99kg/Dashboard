document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    document.querySelector('.login-container').style.opacity = '0';
    document.querySelector('.login-container').style.transform = 'translateY(30px)';
    setTimeout(() => {
        document.querySelector('.login-container').style.transition = 'all 0.6s ease';
        document.querySelector('.login-container').style.opacity = '1';
        document.querySelector('.login-container').style.transform = 'translateY(0)';
    }, 100);
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        if (!username || !password) {
            showError('Please enter both username and password.');
            return;
        }
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Authenticating...';
        submitBtn.disabled = true;
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                loginForm.classList.add('success');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 800);
            } else {
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
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.animation = 'none';
        setTimeout(() => {
            errorMessage.style.animation = 'shake 0.5s';
        }, 10);
    }
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
function validateAdminCredentials() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    if (!username || !password) {
        errorMessage.textContent = 'Please enter both username and password.';
        errorMessage.style.display = 'block';
        return;
    }
    fetch('/api/admin-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.role === 'admin') {
                window.location.href = '/admin';
            } else {
                errorMessage.textContent = data.message || 'Access denied.';
                errorMessage.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            errorMessage.textContent = 'An error occurred while validating credentials.';
            errorMessage.style.display = 'block';
        });
}