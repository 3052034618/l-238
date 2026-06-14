import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, theme, Avatar, Dropdown, Space, Badge } from 'antd'
import {
  DashboardOutlined,
  ScheduleOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  ToolOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { useAppStore } from './store/useAppStore'
import Dashboard from './pages/Dashboard'
import Scheduling from './pages/Scheduling'
import FermentationMonitor from './pages/FermentationMonitor'
import QualityControl from './pages/QualityControl'
import Maintenance from './pages/Maintenance'
import Statistics from './pages/Statistics'
import WorkshopVisualization from './pages/WorkshopVisualization'
import Inventory from './pages/Inventory'
import { useState } from 'react'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '数据概览' },
  { key: '/scheduling', icon: <ScheduleOutlined />, label: '智能排程' },
  { key: '/fermentation', icon: <ThunderboltOutlined />, label: '发酵监测' },
  { key: '/quality', icon: <ExperimentOutlined />, label: '品质管理' },
  { key: '/maintenance', icon: <ToolOutlined />, label: '设备维保' },
  { key: '/inventory', icon: <DatabaseOutlined />, label: '库存管理' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '统计报表' },
  { key: '/visualization', icon: <AppstoreOutlined />, label: '车间可视化' },
]

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    token: { colorBgContainer },
  } = theme.useToken()
  const currentUser = useAppStore((state) => state.currentUser)
  const alarms = useAppStore((state) => state.alarms)
  const [collapsed, setCollapsed] = useState(false)

  const activeAlarms = alarms.filter((a) => a.status === 'active').length

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ]

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 16 : 18,
            fontWeight: 'bold',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {collapsed ? '酒厂' : '智能酿造系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {menuItems.find((m) => m.key === location.pathname)?.label || '数据概览'}
          </div>
          <Space size={16}>
            <Badge count={activeAlarms} size="small">
              <BellOutlined
                style={{ fontSize: 20, cursor: 'pointer', color: '#595959' }}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <span>{currentUser.name}</span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                  ({currentUser.department})
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 0,
            padding: 0,
            minHeight: 280,
            background: '#f0f2f5',
            overflow: 'auto',
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scheduling" element={<Scheduling />} />
            <Route path="/fermentation" element={<FermentationMonitor />} />
            <Route path="/quality" element={<QualityControl />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/visualization" element={<WorkshopVisualization />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
