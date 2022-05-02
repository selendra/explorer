import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import App from './App';
import 'antd/dist/antd.variable.min.css';
import { ConfigProvider } from 'antd';
import { APIContextProvider } from './context/APIContext';

ConfigProvider.config({
  theme: {
    primaryColor: '#03A9F4',
  },
});

ReactDOM.render(
  <APIContextProvider>
    <ConfigProvider>
      <div className='app'>
        <App />
      </div>
    </ConfigProvider>
  </APIContextProvider>,
  document.getElementById('root')
);
