"use client"

// Mock auth context - replace with your actual auth implementation
export const mockUsers = {
  1: {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    picture: "/diverse-user-avatars.png",
    role: "user",
  },
  2: {
    id: "2",
    name: "Admin User",
    email: "admin@example.com",
    picture: "/admin-avatar.png",
    role: "admin",
  },
}

export const getCurrentUser = () => {
  // Mock function - replace with actual session/token validation
  const userId = localStorage.getItem("currentUserId")
  return userId ? mockUsers[userId] : null
}

export const setCurrentUser = (userId) => {
  localStorage.setItem("currentUserId", userId)
}

export const logout = () => {
  localStorage.removeItem("currentUserId")
  window.location.href = "/"
}

export const isAdmin = (user) => {
  return user && user.role === "admin"
}

export const isUser = (user) => {
  return user && user.role === "user"
}
