import React, { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import { MessageCircle, LayoutDashboard } from 'lucide-react';

class LangflowClient {
    constructor(baseURL, applicationToken) {
        this.baseURL = process.env.PUBLIC_URL + '/api'; // Use PUBLIC_URL for GitHub Pages
        this.applicationToken = applicationToken;
    }
    async post(endpoint, body, headers = {"Content-Type": "application/json"}) {
        headers["Authorization"] = `Bearer ${this.applicationToken}`;
        headers["Content-Type"] = "application/json";

        const url = `${this.baseURL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                credentials: 'same-origin'
            });

            const text = await response.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error('Response text:', text);
                throw new Error('Invalid JSON response from server');
            }

            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText} - ${JSON.stringify(json)}`);
            }
            return json;
        } catch (error) {
            console.error('Request Error:', error.message);
            throw error;
        }
    }

    async initiateSession(flowId, langflowId, inputValue, inputType = 'chat', outputType = 'chat', stream = false, tweaks = {}) {
        const endpoint = `/lf/${langflowId}/api/v1/run/${flowId}?stream=${stream}`;
        return this.post(endpoint, { input_value: inputValue, input_type: inputType, output_type: outputType, tweaks: tweaks });
    }

    handleStream(streamUrl, onUpdate, onClose, onError) {
        const eventSource = new EventSource(streamUrl);

        eventSource.onmessage = event => {
            const data = JSON.parse(event.data);
            onUpdate(data);
        };

        eventSource.onerror = event => {
            console.error('Stream Error:', event);
            onError(event);
            eventSource.close();
        };

        eventSource.addEventListener("close", () => {
            onClose('Stream closed');
            eventSource.close();
        });

        return eventSource;
    }

    async runFlow(flowIdOrName, langflowId, inputValue, inputType = 'chat', outputType = 'chat', tweaks = {}, stream = false, onUpdate, onClose, onError) {
        try {
            const initResponse = await this.initiateSession(flowIdOrName, langflowId, inputValue, inputType, outputType, stream, tweaks);
            console.log('Init Response:', initResponse);
            if (stream && initResponse && initResponse.outputs && initResponse.outputs[0].outputs[0].artifacts.stream_url) {
                const streamUrl = initResponse.outputs[0].outputs[0].artifacts.stream_url;
                console.log(`Streaming from: ${streamUrl}`);
                this.handleStream(streamUrl, onUpdate, onClose, onError);
            }
            return initResponse;
        } catch (error) {
            console.error('Error running flow:', error);
            onError('Error initiating session');
        }
    }
}

function App() {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');

    const handleSubmit = async () => {
        if (!inputValue.trim()) return;

        const flowIdOrName = process.env.REACT_APP_FLOW_ID;
        const langflowId = process.env.REACT_APP_LANGFLOW_ID;
        const applicationToken = process.env.REACT_APP_ASTRA_TOKEN;
        const langflowClient = new LangflowClient('', applicationToken);

        try {
            setIsLoading(true);
            setError(''); // Clear any previous errors
            // Add user message immediately
            setMessages(prev => [...prev, { type: 'user', text: inputValue }]);
            const userMessage = inputValue;
            setInputValue('');

            const tweaks = {
                "ChatInput-2BM4d": {},
                "ChatOutput-5Ecy2": {},
                "AstraDBToolComponent-0slpL": {},
                "Agent-tXQtJ": {},
                "Prompt-wQDfs": {},
                "CalculatorTool-IaFHC": {}
            };

            const response = await langflowClient.runFlow(
                flowIdOrName,
                langflowId,
                userMessage,
                'chat',
                'chat',
                tweaks,
                false,
                (data) => console.log("Received:", data),
                (message) => console.log("Stream Closed:", message),
                (error) => setError(error.message)
            );

            console.log('Raw response:', JSON.stringify(response, null, 2));

            if (response && response.outputs && response.outputs[0]) {
                const flowOutput = response.outputs[0];
                console.log('Flow output:', JSON.stringify(flowOutput, null, 2));

                if (flowOutput.outputs && flowOutput.outputs[0]) {
                    const componentOutput = flowOutput.outputs[0];
                    console.log('Component output:', JSON.stringify(componentOutput, null, 2));

                    // Navigate through possible response structures
                    let botResponse = '';
                    
                    if (componentOutput.outputs && componentOutput.outputs.message) {
                        const message = componentOutput.outputs.message;
                        if (message.message && message.message.text) {
                            botResponse = message.message.text;
                        } else if (message.text) {
                            botResponse = message.text;
                        }
                    } else if (componentOutput.message && componentOutput.message.text) {
                        botResponse = componentOutput.message.text;
                    } else if (componentOutput.text) {
                        botResponse = componentOutput.text;
                    }

                    if (botResponse) {
                        console.log('Bot response found:', botResponse);
                        setMessages(prev => [...prev, { type: 'bot', text: botResponse }]);
                    } else {
                        console.error('Could not find response in structure:', componentOutput);
                        setError('Could not extract bot response');
                    }
                }
            } else {
                console.error('Invalid response structure:', response);
                setError('Invalid response from server');
            }
        } catch (error) {
            console.error('Error details:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Social Media Analyzer</h1>
                <div className="tabs">
                    <button 
                        className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        <MessageCircle className="icon" />
                        Chat
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <LayoutDashboard className="icon" />
                        Dashboard
                    </button>
                </div>
            </header>

            {activeTab === 'chat' ? (
                <div className="chat-container">
                    <div className="messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.type}`}>
                                <div className="message-content">
                                    <span className="message-sender">{msg.type === 'user' ? 'You' : 'AI'}</span>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && <div className="message bot">
                            <div className="message-content">
                                <span className="message-sender">AI</span>
                                <p>Thinking...</p>
                            </div>
                        </div>}
                    </div>
                    <div className="input-container">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="Type your message..."
                            disabled={isLoading}
                        />
                        <button onClick={handleSubmit} disabled={isLoading}>
                            Send
                        </button>
                    </div>
                    {error && <div className="error-message">{error}</div>}
                </div>
            ) : (
                <div className="dashboard-container">
                    <Dashboard />
                </div>
            )}
        </div>
    );
}

export default App;
