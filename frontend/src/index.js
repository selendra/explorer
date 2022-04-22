import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import App from './App';
import 'antd/dist/antd.variable.min.css';
import { ConfigProvider } from 'antd';

ConfigProvider.config({
  theme: {
    primaryColor: '#03A9F4',
  },
});

ReactDOM.render(
  <ConfigProvider>
    <div className='app'>
      <App />
    </div>
  </ConfigProvider>,
  document.getElementById('root')
);
