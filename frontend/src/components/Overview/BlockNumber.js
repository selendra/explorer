import { Col } from 'antd';
import { useAPIState } from "../../context/APIContext";

function Main(props) {
  return (
    <Col>
      <p className="home-all-data-title">Last {props.finalized ? 'Finalized' : 'Block'}</p>
      <p className="home-all-data-data">#{props.blockNumber}</p>
    </Col>
  )
}

export default function BlockNumber(props) {
  const { api } = useAPIState();
  return api.derive &&
  api.derive.chain &&
  api.derive.chain.bestNumber &&
  api.derive.chain.bestNumberFinalized ? (
    <Main {...props} />
  ) : null
}