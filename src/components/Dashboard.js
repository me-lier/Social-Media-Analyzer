import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { 
    BarChart, Bar, 
    LineChart, Line,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, 
    AreaChart, Area,
    ResponsiveContainer 
} from 'recharts';
import Papa from 'papaparse';
import './Dashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6384'];

function Dashboard() {
    const [rows, setRows] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Update the path to use the correct URL
                const csvPath = process.env.NODE_ENV === 'development' 
                    ? '/data/dataset.csv' 
                    : `${process.env.PUBLIC_URL}/data/dataset.csv`;
                
                console.log('Loading CSV from:', csvPath); // Debug log
                const response = await fetch(csvPath);
                
                if (!response.ok) {
                    console.error('Failed to load CSV:', response.status, response.statusText);
                    throw new Error(`Failed to load CSV file: ${response.statusText}`);
                }
                
                const csvText = await response.text();
                console.log('CSV content preview:', csvText.slice(0, 100)); // Debug log
                
                Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true, // Skip empty lines
                    complete: (results) => {
                        console.log('Parse results:', results); // Debug log
                        if (results.errors.length > 0) {
                            console.error('CSV Parse Errors:', results.errors);
                            setError('Error parsing CSV data');
                            return;
                        }

                        // Filter out any empty or invalid rows
                        const validData = results.data.filter(row => 
                            row && typeof row === 'object' && Object.keys(row).length > 0
                        );

                        if (validData.length === 0) {
                            setError('No valid data found in CSV');
                            return;
                        }

                        // Generate columns from CSV headers
                        const cols = Object.keys(validData[0]).map(key => ({
                            field: key,
                            headerName: key.replace(/_/g, ' '),
                            width: 150,
                            editable: false
                        }));

                        const dataRows = validData.map((row, index) => ({
                            id: row.Post_Id || index + 1,
                            ...row
                        }));

                        setColumns(cols);
                        setRows(dataRows);
                        setLoading(false);
                    },
                    error: (error) => {
                        console.error('Parse Error:', error);
                        setError('Error parsing CSV file');
                        setLoading(false);
                    }
                });
            } catch (error) {
                console.error('Loading Error:', error);
                setError(`Error loading CSV file: ${error.message}`);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const getStats = () => {
        const postTypes = new Set(rows.map(row => row.Post_Type));
        const totalViews = rows.reduce((sum, row) => sum + (row.Views || 0), 0);
        const totalLikes = rows.reduce((sum, row) => sum + (row.Likes || 0), 0);

        return {
            totalPosts: rows.length,
            uniqueTypes: postTypes.size,
            totalViews,
            totalLikes
        };
    };

    const getPostTypeStats = () => {
        const postTypeCounts = {};
        rows.forEach(row => {
            postTypeCounts[row.Post_Type] = (postTypeCounts[row.Post_Type] || 0) + 1;
        });
        return Object.entries(postTypeCounts).map(([type, count]) => ({
            name: type,
            value: count
        }));
    };

    const getEngagementData = () => {
        return rows.map(row => ({
            date: new Date(row.Date).toLocaleDateString(),
            likes: row.Likes,
            shares: row.Shares,
            comments: row.Comments,
            views: row.Views
        }));
    };

    const getAverageEngagement = () => {
        const postTypes = [...new Set(rows.map(row => row.Post_Type))];
        return postTypes.map(type => {
            const posts = rows.filter(row => row.Post_Type === type);
            const avgLikes = posts.reduce((sum, post) => sum + post.Likes, 0) / posts.length;
            const avgShares = posts.reduce((sum, post) => sum + post.Shares, 0) / posts.length;
            return {
                name: type,
                likes: Math.round(avgLikes),
                shares: Math.round(avgShares)
            };
        });
    };

    const stats = getStats();

    if (error) {
        return (
            <div className="dashboard-error">
                <Typography color="error">{error}</Typography>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <Card className="dashboard-card">
                <CardContent>
                    <Typography variant="h5" component="h2">
                        Social Media Analytics Dashboard
                    </Typography>
                    <div className="stats">
                        <div className="stat-item">
                            <Typography color="textSecondary">Total Posts</Typography>
                            <Typography variant="h6">{stats.totalPosts}</Typography>
                        </div>
                        <div className="stat-item">
                            <Typography color="textSecondary">Post Types</Typography>
                            <Typography variant="h6">{stats.uniqueTypes}</Typography>
                        </div>
                        <div className="stat-item">
                            <Typography color="textSecondary">Total Views</Typography>
                            <Typography variant="h6">{stats.totalViews.toLocaleString()}</Typography>
                        </div>
                        <div className="stat-item">
                            <Typography color="textSecondary">Total Likes</Typography>
                            <Typography variant="h6">{stats.totalLikes.toLocaleString()}</Typography>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="charts-grid">
                <Card className="chart-card">
                    <CardContent>
                        <Typography variant="h6">Post Type Distribution</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={getPostTypeStats()}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {getPostTypeStats().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="chart-card">
                    <CardContent>
                        <Typography variant="h6">Engagement Trends</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getEngagementData()}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="likes" stroke="#8884d8" />
                                <Line type="monotone" dataKey="shares" stroke="#82ca9d" />
                                <Line type="monotone" dataKey="comments" stroke="#ffc658" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="chart-card">
                    <CardContent>
                        <Typography variant="h6">Average Engagement by Post Type</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={getAverageEngagement()}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="likes" fill="#8884d8" />
                                <Bar dataKey="shares" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="chart-card">
                    <CardContent>
                        <Typography variant="h6">Views Distribution</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={getEngagementData()}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="views" stroke="#8884d8" fill="#8884d8" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="data-grid-container">
                {loading ? (
                    <div className="loading-container">
                        <CircularProgress />
                        <Typography>Loading data...</Typography>
                    </div>
                ) : (
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[10, 25, 50]}
                        checkboxSelection
                        disableSelectionOnClick
                        density="comfortable"
                        autoHeight
                    />
                )}
            </div>
        </div>
    );
}

export default Dashboard;
