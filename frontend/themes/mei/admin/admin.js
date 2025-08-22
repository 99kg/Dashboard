document.addEventListener('DOMContentLoaded', async function () {
    const usernameDisplay = document.getElementById('username');
    const errorMessage = document.getElementById('errorMessage');
    const userTableBody = document.querySelector('#userTable tbody');
    let currentUsername = '';

    // 获取当前登录的用户名
    try {
        const response = await fetch('/api/check-session', {
            method: 'GET',
            credentials: 'include',
        });

        const data = await response.json();

        if (response.ok && data.authenticated) {
            currentUsername = data.username; // 动态获取当前用户名
            usernameDisplay.textContent = currentUsername;
        } else {
            usernameDisplay.textContent = 'Unknown User';
        }
    } catch (error) {
        console.error('Error fetching session:', error);
        usernameDisplay.textContent = 'Unknown User';
    }

    // 全局拦截器：处理所有 fetch 请求的 401 响应
    async function fetchWithAuth(url, options = {}) {
        const response = await fetch(url, options);
        if (response.status === 401) {
            // 如果未认证，跳转到登录页面
            window.location.href = '/login';
            return null; // 返回 null 表示未认证
        }
        return response;
    }

    // 加载用户列表
    async function fetchUsers() {
        const errorMessage = document.getElementById('errorMessage');
        const userTableBody = document.querySelector('#userTable tbody');

        try {
            const response = await fetchWithAuth('/api/admin/users', {
                method: 'GET',
                credentials: 'include',
            });

            if (response.status === 401) {
                // 如果未认证，跳转到登录页面
                window.location.href = '/login';
                return;
            }

            const data = await response.json();

            if (response.ok && data.users) {
                populateUserTable(data.users);
                setTimeout(() => {
                    errorMessage.style.display = "none";
                }, 1000); // 1秒后隐藏错误信息
            } else {
                errorMessage.textContent = data.error || 'Failed to fetch users.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'An error occurred while fetching users.';
            errorMessage.style.display = 'block';
        }
    }

    // 填充用户表格
    function populateUserTable(users) {
        userTableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>${user.lastLogin}</td>
                <td>
                    <button class="action-btn edit" ${user.username === currentUsername ? 'disabled style="background-color: #ccc; cursor: not-allowed;"' : ''} data-id="${user.id}" data-role="${user.role}">Edit</button>
                    <button class="action-btn delete" ${user.username === currentUsername ? 'disabled style="background-color: #ccc; cursor: not-allowed;"' : ''} data-id="${user.id}">Delete</button>
                </td>
            `;
            userTableBody.appendChild(row);
        });

        // 添加事件监听
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', handleEditUser);
        });

        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', handleDeleteUser);
        });
    }

    // 编辑用户
    async function handleEditUser(event) {
        const userId = event.target.dataset.id;
        const currentRole = event.target.dataset.role; // 获取当前用户角色

        // 创建角色和密码修改对话框
        const editDialog = document.createElement('div');
        editDialog.className = 'edit-dialog';
        editDialog.innerHTML = `
            <div class="dialog-content">
                <h3>Edit User</h3>
                <label for="usernameInput">Enter new username:</label>
                <input type="text" id="usernameInput" placeholder="New username" />
                <label for="roleSelect">Select new role:</label>
                <select id="roleSelect">
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>admin</option>
                    <option value="user" ${currentRole === 'user' ? 'selected' : ''}>user</option>
                </select>
                <label for="passwordInput">Enter new password:</label>
                <input type="password" id="passwordInput" placeholder="New password" />
                <div class="dialog-actions">
                    <button id="confirmEditBtn">Confirm</button>
                    <button id="cancelEditBtn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(editDialog);

        // 校验用户名密码长度
        const usernameInput = document.getElementById('usernameInput');
        const passwordInput = document.getElementById('passwordInput');

        // 添加事件监听
        document.getElementById('confirmEditBtn').addEventListener('click', async () => {
            const newRole = document.getElementById('roleSelect').value;
            const newUsername = document.getElementById('usernameInput').value;
            const newPassword = document.getElementById('passwordInput').value;

            if (usernameInput.value && usernameInput.value.length < 3 || usernameInput.value.length > 20) {
                errorMessage.textContent = "Username must be between 3 and 20 characters long.";
                errorMessage.style.display = "block";
                setTimeout(() => {
                    errorMessage.style.display = "none";
                }, 1000); // 1秒后隐藏错误信息
                return;
            }

            if (passwordInput.value && passwordInput.value.length < 6 || passwordInput.value.length > 20) {
                errorMessage.textContent = "Password must be between 6 and 20 characters long.";
                errorMessage.style.display = "block";
                setTimeout(() => {
                    errorMessage.style.display = "none";
                }, 1000); // 1秒后隐藏错误信息
                return;
            }

            try {
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: newUsername,
                        role: newRole,
                        password: newPassword,
                    }),
                });

                const data = await response.json();
                if (response.ok) {
                    errorMessage.textContent = 'User updated successfully.';
                    errorMessage.style.display = 'block';
                    setTimeout(() => {
                        errorMessage.style.display = 'none';
                    }, 1000);
                    fetchUsers();
                    document.body.removeChild(editDialog); // 仅在成功时移除对话框
                } else {
                    errorMessage.textContent = data.error || 'Failed to update user.';
                    errorMessage.style.display = 'block';
                    setTimeout(() => {
                        errorMessage.style.display = 'none';
                    }, 1000); // 3秒后隐藏错误信息
                }
            } catch (error) {
                errorMessage.textContent = 'An error occurred while updating user.';
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 1000);
            }
        });

        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            document.body.removeChild(editDialog); // 移除对话框
        });
    }

    // 删除用户
    async function handleDeleteUser(event) {
        const userId = event.target.dataset.id;
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (response.ok) {
                errorMessage.textContent = 'User deleted successfully.';
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 1000);
                fetchUsers();
            } else {
                errorMessage.textContent = data.error || 'Failed to delete user.';
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 1000);
            }
        } catch (error) {
            errorMessage.textContent = 'An error occurred while deleting user.';
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 1000);
        }
    }

    // 加载用户列表
    fetchUsers();

    // 登出功能
    document.getElementById('logoutBtn').addEventListener('click', function () {
        fetch('/logout', {
            method: 'GET',
            credentials: 'include',
        })
            .then(() => {
                window.location.href = '/login';
            })
            .catch(error => console.error('Logout error:', error));
    });
});