import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaUsers, FaCar, FaEuroSign, FaCalendarAlt, FaChartLine, 
  FaUserCheck, FaUserTimes, FaExclamationTriangle, FaFilter
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import {useEffect} from 'react'


const socket = io(
    process.env.REACT_APP_API_URL.replace('/api', ''),
    {
      withCredentials: true
    }
)

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('week');

  const [pendingParkings, setPendingParkings]= useState([])

    // recuperer les parkings "under_review"

  const fetchPendingParkings = async () => {
  try {
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/parkings?status=under_review`,
      { withCredentials: true }
    );

    setPendingParkings(res.data.data || []);
  } catch (error) {
    console.error('Erreur chargement parkings en attente:', error);
  }
 };

  

  useEffect(()=> {
    // rejoindre la root admin
    socket.emit('join-admin')
    //ecouter les nouveaux parkings

    socket.on('new-parking', (data)=> {
    
      fetchPendingParkings();

      toast.info(
        `nouveau parking à valider : ${data.parkingName}`,
        {position: 'top-right'},
      )  
    } )
    return ()=> {
      socket.off('new-parking')
    }
  }, [])

  useEffect(() => {
  fetchPendingParkings();
  }, []);


  const approveParking = async (id) => {
    await axios.put(
      `${process.env.REACT_APP_API_URL}/admin/parkings/${id}/approve`,
      {},
      { withCredentials: true }
    );
    fetchPendingParkings(); // refresh table
  };

  const rejectParking = async (id) => {
    await axios.put(
      `${process.env.REACT_APP_API_URL}/admin/parkings/${id}/reject`,
      {},
      { withCredentials: true }
    );
    fetchPendingParkings();
  };

  const { data: stats, isLoading } = useQuery(
    ['adminStats', timeRange],
    () => axios.get('/admin/stats', { params: { range: timeRange } }).then(res => res.data.data)
  );

  const { data: recentActivities } = useQuery(
    'recentActivities',
    () => axios.get('/admin/activities').then(res => res.data.data)
  );

  const statsCards = [
    {
      title: 'Utilisateurs totaux',
      value: stats?.totalUsers || 0,
      icon: <FaUsers size={30} />,
      color: 'primary',
      change: '+12%'
    },
    {
      title: 'Parkings actifs',
      value: stats?.activeParkings || 0,
      icon: <FaCar size={30} />,
      color: 'success',
      change: '+5%'
    },
    {
      title: 'Revenu total',
      value: `${stats?.totalRevenue?.toFixed(2) || '0.00'}€`,
      icon: <FaEuroSign size={30} />,
      color: 'warning',
      change: '+18%'
    },
    {
      title: 'Réservations aujourd\'hui',
      value: stats?.todayReservations || 0,
      icon: <FaCalendarAlt size={30} />,
      color: 'info',
      change: '+8%'
    }
  ];

  const userStats = [
    { name: 'Actifs', value: stats?.activeUsers || 0, color: '#28a745' },
    { name: 'Inactifs', value: stats?.inactiveUsers || 0, color: '#6c757d' },
    { name: 'En attente', value: stats?.pendingUsers || 0, color: '#ffc107' },
    { name: 'Suspendus', value: stats?.suspendedUsers || 0, color: '#dc3545' }
  ];

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Chargement du tableau de bord...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="fw-bold">Tableau de Bord Administrateur</h1>
              <p className="text-muted">Vue d'ensemble de la plateforme</p>
            </div>
            <Form.Select 
              style={{ width: '200px' }}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="day">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </Form.Select>
          </div>
        </Col>
      </Row>

      {/* Cartes de statistiques */}
      <Row className="mb-4">
        {statsCards.map((card, index) => (
          <Col key={index} xl={3} lg={6} className="mb-4">
            <Card className="shadow-sm border-0">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-2">{card.title}</h6>
                    <h2 className="fw-bold">{card.value}</h2>
                    <small className={`text-${card.change.startsWith('+') ? 'success' : 'danger'}`}>
                      {card.change} vs période précédente
                    </small>
                  </div>
                  <div className={`text-${card.color}`}>
                    {card.icon}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="mb-4">
        {/* Graphique des réservations */}
        <Col lg={8} className="mb-4">
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FaChartLine className="me-2" />
                Évolution des réservations
              </h6>
              <Badge bg="light" text="dark">
                {timeRange === 'day' ? '24h' : 
                 timeRange === 'week' ? '7 jours' : 
                 timeRange === 'month' ? '30 jours' : '12 mois'}
              </Badge>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.reservationTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="reservations" 
                    name="Réservations" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenu (€)" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Répartition des utilisateurs */}
        <Col lg={4} className="mb-4">
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <FaUsers className="me-2" />
                Statut des utilisateurs
              </h6>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3">
                {userStats.map(stat => (
                  <div key={stat.name} className="d-flex justify-content-between mb-2">
                    <span>
                      <Badge style={{ backgroundColor: stat.color, width: '12px', height: '12px' }} className="me-2" />
                      {stat.name}
                    </span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Activités récentes */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Activités récentes</h6>
            </Card.Header>
            <Card.Body className="p-0">
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Utilisateur</th>
                      <th>Action</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities?.map((activity, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img
                              src={activity.user.avatar}
                              alt={activity.user.name}
                              className="rounded-circle me-2"
                              width="30"
                              height="30"
                            />
                            <span>{activity.user.name}</span>
                          </div>
                        </td>
                        <td>
                          <Badge bg={activity.type === 'login' ? 'success' : 
                                    activity.type === 'reservation' ? 'primary' : 
                                    activity.type === 'payment' ? 'warning' : 'info'}>
                            {activity.action}
                          </Badge>
                        </td>
                        <td className="text-muted">{activity.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Parkings en attente */}
        <Col lg={6} className="mb-4">
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FaExclamationTriangle className="me-2 text-warning" />
                Parkings en attente de validation
              </h6>
              <Badge bg="warning">{pendingParkings.length || 0}</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Parking</th>
                      <th>Propriétaire</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingParkings.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">
                          Aucun parking en attente
                        </td>
                      </tr>
                    ) : (
                      pendingParkings.map((parking) => (
                        <tr key={parking._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img
                                src={
                                  parking.images?.find(img => img.isMain)?.url ||
                                  parking.images?.[0]?.url ||
                                  '/default-parking.jpg'
                                }
                                alt={parking.name}
                                width="40"
                                height="40"
                                className="me-2"
                                style={{ objectFit: 'cover' }}
                              />
                              <span>{parking.name}</span>
                            </div>
                          </td>
                          <td>
                            {parking.owner?.firstName} {parking.owner?.lastName}
                          </td>
                          <td>{new Date(parking.createdAt).toLocaleDateString()}</td>
                          <td>
                            <Button size="sm" variant="success" className="me-1" onClick={()=> approveParking(parking._id)}>
                              <FaUserCheck />
                            </Button>
                            <Button size="sm" variant="danger" onClick={()=> rejectParking(parking._id)}>
                              <FaUserTimes />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;