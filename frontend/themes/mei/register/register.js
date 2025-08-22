document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const adminPassword = document.getElementById("adminPassword").value;

    const errorMessage = document.getElementById("errorMessage");

    // 校验用户名长度
    if (username.length < 3 || username.length > 20) {
        showError("Username must be between 3 and 20 characters long.");
        return;
    }

    // 校验密码长度
    if (password.length < 6 || password.length > 20) {
        showError("Password must be between 6 and 20 characters long.");
        return;
    }

    if (password !== confirmPassword) {
        showError("User passwords do not match.");
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password, adminPassword }),
        });

        const data = await response.json();

        if (response.ok) {
            errorMessage.textContent = "User registered successfully!";
            errorMessage.style.display = "block";
            setTimeout(() => {
                window.location.href = "/login";
            }, 2000); // 延迟跳转以便用户看到消息
        } else {
            showError(data.error || "Registration failed.");
        }
    } catch (error) {
        showError("An error occurred. Please try again.");
    }
});

// 显示错误消息的函数
function showError(message) {
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.textContent = message;
    errorMessage.style.display = "block";

    // 添加错误动画
    errorMessage.style.animation = "none";
    setTimeout(() => {
        errorMessage.style.animation = "shake 0.5s";
    }, 10);
}

// 为错误消息添加CSS动画
const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-8px); }
        40%, 80% { transform: translateX(8px); }
    }
`;
document.head.appendChild(style);