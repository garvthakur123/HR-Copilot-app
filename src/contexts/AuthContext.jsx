import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const SEED_USERS = [
  { id: 1, email: 'hr@company.com', password: 'hr123', name: 'Sarah Mitchell', role: 'HR Manager', avatar: 'SM' },
  { id: 2, email: 'admin@company.com', password: 'admin123', name: 'Alex Johnson', role: 'HR Admin', avatar: 'AJ' },
]

function loadUsers() {
  try {
    const stored = localStorage.getItem('hr_registered_users')
    return stored ? JSON.parse(stored) : SEED_USERS
  } catch { return SEED_USERS }
}

function saveUsers(users) {
  localStorage.setItem('hr_registered_users', JSON.stringify(users))
}

function makeAvatar(name) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('hr_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  function login(email, password) {
    const users = loadUsers()
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (found) {
      const { password: _, ...safe } = found
      setUser(safe)
      localStorage.setItem('hr_user', JSON.stringify(safe))
      return { ok: true }
    }
    return { ok: false, error: 'Invalid email or password' }
  }

  function register({ name, email, password, role }) {
    const users = loadUsers()
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists' }
    }
    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || 'HR Recruiter',
      avatar: makeAvatar(name),
    }
    const updated = [...users, newUser]
    saveUsers(updated)
    const { password: _, ...safe } = newUser
    setUser(safe)
    localStorage.setItem('hr_user', JSON.stringify(safe))
    return { ok: true }
  }

  function updateProfile({ name, email, role, currentPassword, newPassword }) {
    const users = loadUsers()
    const idx = users.findIndex(u => u.id === user.id)
    if (idx === -1) return { ok: false, error: 'User not found' }

    if (newPassword) {
      if (users[idx].password !== currentPassword) return { ok: false, error: 'Current password is incorrect' }
    }

    const updated = { ...users[idx], name: name.trim(), email: email.trim().toLowerCase(), role }
    if (newPassword) updated.password = newPassword
    updated.avatar = makeAvatar(name)

    const updatedUsers = users.map((u, i) => i === idx ? updated : u)
    saveUsers(updatedUsers)

    const { password: _, ...safe } = updated
    setUser(safe)
    localStorage.setItem('hr_user', JSON.stringify(safe))
    return { ok: true }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('hr_user')
  }

  return <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
