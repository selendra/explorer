import { Col, Row } from "antd";
import React from "react";
import { useAPIState } from "../../context/APIContext";
import BlockNumber from "./BlockNumber";

export default function Overview(props) {
  const { api } = useAPIState();
  const [validators, setValidators] = React.useState();
  const [blockNumber, setBlockNumber] = React.useState(0);
  
  const { finalized } = props;
  const validatorsData = api.query.session.validators;
  const bestNumber = finalized
    ? api.derive.chain.bestNumberFinalized
    : api.derive.chain.bestNumber

  React.useEffect(() => {
    let unsubscribeAll = null;

    bestNumber(number => {
      // Append `.toLocaleString('en-US')` to display a nice thousand-separated digit.
      setBlockNumber(number.toNumber().toLocaleString('en-US'));
    })
    validatorsData(data => {
      setValidators(data.toHuman());
    })
    
    .then(unsub => {
      unsubscribeAll = unsub;
    })
    .catch(console.error)

    return () => unsubscribeAll && unsubscribeAll();
  }, [bestNumber, validatorsData]);

  return (
    <div className="home-all-data">
      <Row justify="center" align="middle" gutter={[8, 8]}>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <BlockNumber blockNumber={blockNumber} />
          <Col>
            <p className="home-all-data-title">Transfers</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_transfers)}</p>
          </Col>
        </Col>
        <Col xs={4} sm={3} md={3} lg={3} xl={3}>
          <Row justify="center">
            <div className="home-divider" />
          </Row>
        </Col>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <BlockNumber blockNumber={blockNumber} finalized />
          <Col>
            <p className="home-all-data-title">Accounts</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_accounts)}</p>
          </Col>
        </Col>
        <Col xs={0} sm={3} md={3} lg={3} xl={3}>
          <Row justify="center">
            <div className="home-divider" />
          </Row>
        </Col>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Total Extrinsic</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_extrinsics)}</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Total Validators</p>
            <p className="home-all-data-data">#{validators?.length}</p>
          </Col>
        </Col>
        <Col xs={4} sm={3} md={3} lg={3} xl={3}>
          <Row justify="center">
            <div className="home-divider" />
          </Row>
        </Col>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Total Events</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_events)}</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Total Nominator</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_nominators)}</p>
          </Col>
        </Col>
      </Row>
    </div>
  );
}


