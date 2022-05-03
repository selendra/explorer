import { Card, Spin, Tabs } from 'antd';
import { useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { timeDuration } from '../../utils';
import ExtrinsicsTable from '../../components/ExtrinsicsTable';
import EventsTable from '../../components/EventsTable';
import LogsTable from '../../components/LogsTable';
import Loading from '../../components/Loading';
import NotFound from '../../components/NotFound';

export default function BlockDetail() {
  const { id } = useParams();

  const { loading, data = [], error } = useFetch(
    `${process.env.REACT_APP_API}/block/${id}`
  );
  const { data: extrinsicData = [] } = useFetch(
    `${process.env.REACT_APP_API}/extrinsic/block/${id}`
  );
  const { data: eventData = [] } = useFetch(
    `${process.env.REACT_APP_API}/event/block/${id}`
  );
  const { data: logData = [] } = useFetch(
    `${process.env.REACT_APP_API}/log/block/${id}`
  );

  if(loading) return (
    <div className="container">
      <Loading />
    </div>
  )

  if(error) return (
    <div className="container">
      <NotFound error={error} />
    </div>
  )

  return (
    <div className='container'>
      <div className='spacing' />
      <p className='block-title'>Block #{id}</p>
      <Card className='block-detail-card' style={{borderRadius: '8px'}}>
        <table className='table'>
          <tbody>
            <tr>
              <td>Timestamp</td>
              <td>{data?.timestamp}</td>
            </tr>
            <tr>
              <td>Status</td>
              <td>
                { data?.finalized ? 
                  <div>
                    <img 
                      src='/assets/icons/check.svg' 
                      alt='finalized'
                      width={18} 
                      height={18}
                    /> 
                    <span style={{marginLeft: '4px'}}>Finalized</span>
                  </div>
                  :
                  <Spin size='small'/> 
                }
              </td>
            </tr>
            <tr>
              <td>Hash</td>
              <td>{data?.blockHash}</td>
            </tr>
            <tr>
              <td>Parent Hash</td>
              <td>{data?.parentHash}</td>
            </tr>
            <tr>
              <td>State Root</td>
              <td>{data?.stateRoot}</td>
            </tr>
            <tr>
              <td>Block Author</td>
              <td>{data?.blockAuthor}</td>
            </tr>
            <tr>
              <td>Block Time</td>
              <td>{timeDuration(data?.timestamp)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <div className='spacing'/>
      <Tabs size='large'>
        <Tabs.TabPane tab='Extrinsics' key='extrinsics'>
          <ExtrinsicsTable 
            data={extrinsicData}
            loading={loading}
          /> 
        </Tabs.TabPane>
        <Tabs.TabPane tab='Events' key='events'>
          <EventsTable 
            data={eventData}
            loading={loading}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab='Logs' key='logs'>
          <LogsTable 
            data={logData}
            loading={loading}
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}
