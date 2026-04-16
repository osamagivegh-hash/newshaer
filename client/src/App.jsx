import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AdminProvider } from './contexts/AdminContext'
import { FamilyTreeAuthProvider } from './contexts/FamilyTreeAuthContext'
import { LayoutProvider } from './contexts/LayoutContext'
import { ForumAuthProvider } from './contexts/ForumAuthContext'

// Forum Components
import ForumLayout from './components/Forum/ForumLayout'
import ForumHome from './pages/forum/ForumHome'
import ForumCategory from './pages/forum/ForumCategory'
import ForumTopic from './pages/forum/ForumTopic'
import ForumCreateTopic from './pages/forum/ForumCreateTopic'
import ForumLogin from './pages/forum/ForumLogin'
import ForumRegister from './pages/forum/ForumRegister'
import ForumAdminDashboard from './pages/forum/ForumAdminDashboard'
import ForumProfile from './pages/forum/ForumProfile'
import ForumUserProfile from './pages/forum/ForumUserProfile'

// Mobile CSS
import './styles/mobile.css'

// Layout Components
import ErrorBoundary from './components/common/ErrorBoundary'

// Public Components
import PublicApp from './components/PublicApp'
import ResponsiveLayoutWrapper from './components/ResponsiveLayoutWrapper'
import ArticleDetail from './components/ArticleDetail'
import ConversationDetail from './components/ConversationDetail'
import NotFound from './components/common/NotFound'
import ScrollToTop from './components/common/ScrollToTop'
import ArchivePage from './pages/Archive'
import FamilyTreePage from './pages/FamilyTreePage'
import FamilyTreeGateway from './pages/FamilyTreeGateway'
import NewsPage from './pages/NewsPage'
import NewsDetail from './components/NewsDetail'
import FbNewsPage from './pages/FbNewsPage'
import FbNewsDetailPage from './pages/FbNewsDetailPage'

// Family Tree Section Pages
import FounderAppreciation from './pages/FounderAppreciation'
import FamilyTreeDisplayPage from './pages/FamilyTreeDisplayPage'
import OliveTreePage from './pages/OliveTreePage'
import LineageTreePage from './pages/LineageTreePage'
import OrganicOliveTreePage from './pages/OrganicOliveTreePage'
import FullOrganicTreePage from './pages/FullOrganicTreePage'
import SafeFullTreePage from './pages/SafeFullTreePage'
import RecoveryTreeTestPage from './pages/RecoveryTreeTestPage'
import RecoveryOrganicTreePage from './pages/RecoveryOrganicTreePage'
import RealTreePage from './pages/RealTreePage'
import FamilyTreeBranchSelection from './pages/FamilyTreeBranchSelection'
import ZaharBranchSelection from './pages/ZaharBranchSelection'
import SalehBranchSelection from './pages/SalehBranchSelection'
import SalmanBranchSelection from './pages/SalmanBranchSelection'
import DevTeamPage from './pages/DevTeamPage'
import PersonLineagePage from './pages/PersonLineagePage'

// CMS Admin Components
import AdminLogin from './components/admin/AdminLogin'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminNews from './components/admin/AdminNews'
import AdminConversations from './components/admin/AdminConversations'
import AdminArticles from './components/admin/AdminArticles'
import AdminPalestine from './components/admin/AdminPalestine'
import AdminGallery from './components/admin/AdminGallery'
import AdminComments from './components/admin/AdminComments'
import AdminContacts from './components/admin/AdminContacts'
import AdminSettings from './components/admin/AdminSettings'
import AdminTickers from './components/admin/AdminTickers'
import AdminDevTeamMessages from './components/admin/AdminDevTeamMessages'
import AdminUserManagement from './components/admin/AdminUserManagement'
import CMSBackupManager from './components/admin/CMSBackupManager'
import ProtectedRoute from './components/admin/ProtectedRoute'
import PermissionGuard from './components/admin/PermissionGuard'

// ===== ISOLATED FAMILY TREE DASHBOARD (Separate Auth System) =====
import FamilyTreeDashboardLayout from './components/admin/FamilyTreeDashboardLayout'
import FamilyTreeDashboardOverview from './components/admin/FamilyTreeDashboardOverview'
import FamilyTreeLogin from './components/FamilyTree/FamilyTreeLogin'
import FamilyTreeProtectedRoute from './components/FamilyTree/FamilyTreeProtectedRoute'
import AdminFamilyTree from './components/admin/AdminFamilyTree'
import AdminFamilyTreeContent from './components/admin/AdminFamilyTreeContent'
import FamilyTreeBackupManager from './components/admin/FamilyTreeBackupManager'
import FamilyTreeUserManagement from './components/admin/FamilyTreeUserManagement'

function App() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <FamilyTreeAuthProvider>
          <Router>
            <ForumAuthProvider>
              <LayoutProvider>
                <div className="min-h-screen bg-palestine-white">
                  <ScrollToTop />
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<ResponsiveLayoutWrapper />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    <Route path="/news" element={<FbNewsPage />} />
                    <Route path="/news/:id" element={<FbNewsDetailPage />} />

                    {/* Family Tree Section Routes */}
                    <Route path="/family-tree" element={<FamilyTreeGateway />} />
                    <Route path="/family-tree/appreciation" element={<FounderAppreciation />} />
                    <Route path="/family-tree/tree" element={<FamilyTreeBranchSelection />} />
                    <Route path="/family-tree/tree/zahar" element={<ZaharBranchSelection />} />
                    <Route path="/family-tree/tree/saleh" element={<SalehBranchSelection />} />
                    <Route path="/family-tree/tree/saleh/salman" element={<SalmanBranchSelection />} />
                    <Route path="/family-tree/visual" element={<FamilyTreeDisplayPage />} />
                    <Route path="/family-tree/olive" element={<OliveTreePage />} />
                    <Route path="/family-tree/lineage" element={<LineageTreePage />} />
                    <Route path="/family-tree/organic-olive" element={<OrganicOliveTreePage />} />
                    <Route path="/family-tree/full-organic-olive" element={<FullOrganicTreePage />} />
                    <Route path="/family-tree/safe-full-tree" element={<SafeFullTreePage />} />
                    <Route path="/family-tree-test" element={<RecoveryTreeTestPage />} />
                    <Route path="/family-tree-organic-test" element={<RecoveryOrganicTreePage />} />
                    <Route path="/family-tree-real-test" element={<RealTreePage />} />
                    <Route path="/family-tree/lineage/:personId" element={<PersonLineagePage />} />
                    <Route path="/family-tree/dev-team" element={<DevTeamPage />} />

                    {/* FORUM ROUTES */}
                    <Route path="/family-tree/forum" element={<ForumLayout />}>
                      <Route index element={<ForumHome />} />
                      <Route path="login" element={<ForumLogin />} />
                      <Route path="register" element={<ForumRegister />} />
                      <Route path="category/:id" element={<ForumCategory />} />
                      <Route path="category/:categoryId/new" element={<ForumCreateTopic />} />
                      <Route path="topic/:id" element={<ForumTopic />} />
                      <Route path="admin" element={<ForumAdminDashboard />} />
                      <Route path="profile" element={<ForumProfile />} />
                      <Route path="user/:id" element={<ForumUserProfile />} />
                    </Route>

                    {/* Legacy route - redirects to gateway */}
                    <Route path="/family-tree-old" element={<FamilyTreePage />} />

                    <Route path="/articles/:id" element={<ArticleDetail />} />
                    <Route path="/conversations/:id" element={<ConversationDetail />} />

                    {/* ===== CMS ADMIN ROUTES (Uses AdminContext) ===== */}
                    <Route path="/admin/login" element={<AdminLogin />} />

                    {/* ===== ISOLATED FAMILY TREE DASHBOARD (Uses FamilyTreeAuthContext) ===== */}
                    {/* SECURITY: This is a completely separate authentication system */}
                    <Route path="/family-dashboard/login" element={<FamilyTreeLogin />} />
                    <Route path="/family-dashboard/*" element={
                      <FamilyTreeProtectedRoute>
                        <FamilyTreeDashboardLayout />
                      </FamilyTreeProtectedRoute>
                    }>
                      {/* Family Tree Dashboard Pages */}
                      <Route index element={<FamilyTreeDashboardOverview />} />
                      <Route path="members" element={<AdminFamilyTree />} />
                      <Route path="tree" element={<AdminFamilyTree />} />
                      <Route path="content" element={<AdminFamilyTreeContent />} />
                      <Route path="backups" element={<FamilyTreeBackupManager />} />
                      <Route path="users" element={<FamilyTreeUserManagement />} />
                    </Route>

                    {/* ===== MAIN CMS ADMIN ROUTES ===== */}
                    <Route path="/admin/*" element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }>
                      {/* Dashboard - accessible to all logged in users */}
                      <Route path="dashboard" element={<AdminDashboard />} />

                      {/* News - requires 'news' permission */}
                      <Route path="news" element={
                        <PermissionGuard permission="news">
                          <AdminNews />
                        </PermissionGuard>
                      } />

                      {/* Conversations - requires 'conversations' permission */}
                      <Route path="conversations" element={
                        <PermissionGuard permission="conversations">
                          <AdminConversations />
                        </PermissionGuard>
                      } />

                      {/* Articles - requires 'articles' permission */}
                      <Route path="articles" element={
                        <PermissionGuard permission="articles">
                          <AdminArticles />
                        </PermissionGuard>
                      } />

                      {/* Palestine - requires 'palestine' permission */}
                      <Route path="palestine" element={
                        <PermissionGuard permission="palestine">
                          <AdminPalestine />
                        </PermissionGuard>
                      } />

                      {/* Gallery - requires 'gallery' permission */}
                      <Route path="gallery" element={
                        <PermissionGuard permission="gallery">
                          <AdminGallery />
                        </PermissionGuard>
                      } />

                      {/* Comments - requires articles, news, or conversations permission */}
                      <Route path="comments" element={
                        <PermissionGuard permission="articles">
                          <AdminComments />
                        </PermissionGuard>
                      } />

                      {/* Contacts - requires 'contacts' permission */}
                      <Route path="contacts" element={
                        <PermissionGuard permission="contacts">
                          <AdminContacts />
                        </PermissionGuard>
                      } />

                      {/* Tickers - requires 'news' or 'palestine' permission */}
                      <Route path="tickers" element={
                        <PermissionGuard permission="news">
                          <AdminTickers />
                        </PermissionGuard>
                      } />

                      {/* Dev Team - requires 'dev-team' permission */}
                      <Route path="dev-team" element={
                        <PermissionGuard permission="dev-team">
                          <AdminDevTeamMessages />
                        </PermissionGuard>
                      } />

                      {/* User Management - handled internally (super-admin only) */}
                      <Route path="users" element={<AdminUserManagement />} />

                      {/* CMS Backups - admin/super-admin only */}
                      <Route path="cms-backups" element={<CMSBackupManager />} />

                      {/* Settings - requires 'settings' permission */}
                      <Route path="settings" element={
                        <PermissionGuard permission="settings">
                          <AdminSettings />
                        </PermissionGuard>
                      } />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>

                  {/* Toast Notifications */}
                  <Toaster
                    position="top-center"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                        fontFamily: 'Cairo, sans-serif',
                        direction: 'rtl'
                      },
                      success: {
                        duration: 3000,
                        iconTheme: {
                          primary: '#007A3D',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        duration: 5000,
                        iconTheme: {
                          primary: '#CE1126',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                </div>
              </LayoutProvider>
            </ForumAuthProvider>
          </Router>
        </FamilyTreeAuthProvider>
      </AdminProvider>
    </ErrorBoundary>
  )
}

export default App
