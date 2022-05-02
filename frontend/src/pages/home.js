import { Col, Row } from "antd";
import { useEffect, useState } from "react";
import Search from "../components/Search";
import Overview from "../components/Overview";
import BlocksTable from "../components/BlocksTable";
import ExtrinsicsTable from "../components/ExtrinsicsTable";
import { useAPIState } from "../context/APIContext";

export default function Home() {
  const { api } = useAPIState();
  const [loading, setLoading] = useState(true);
  const [blockNumber, setBlockNumber] = useState(0);
  const [blockNumberFinalized, setBlockNumberFinalized] = useState(0);
  const [validators, setValidators] = useState(0);
  const [overview, setOverview] = useState();

  const bestNumber = api.derive.chain.bestNumber;
  const bestNumberFinalized = api.derive.chain.bestNumberFinalized;
  const validatorsData = api.query.session.validators;

  useEffect(() => {
    let unsubscribeAll = null;

    bestNumber(number => {
      setBlockNumber(number.toNumber().toLocaleString('en-US'));
    })
    bestNumberFinalized(number => {
      setBlockNumberFinalized(number.toNumber().toLocaleString('en-US'));
    })
    validatorsData(data => {
      setValidators(data.toHuman());
    })
    .then(unsub => {
      unsubscribeAll = unsub;
    })
    .catch(console.error);

    return () => unsubscribeAll && unsubscribeAll();
  }, [bestNumber, bestNumberFinalized, validatorsData])

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.REACT_APP_API}/block/all/1`),
      fetch(`${process.env.REACT_APP_API}/extrinsic/all/1`),
      fetch(`${process.env.REACT_APP_API}/event/all/1`),
      fetch(`${process.env.REACT_APP_API}/totals`),
      fetch(`${process.env.REACT_APP_API}/staking/status`)
    ])
    .then(async([a, b, c, d, e]) => {
      const block = await a.json();
      const extrinsic = await b.json();
      const event = await c.json();
      const trxAndAccount = await d.json();
      const staking = await e.json();
      
      setLoading(false);
      setOverview({
        block,
        extrinsic,
        event,
        trxAndAccount,
        staking
      })
    })
    .catch(err => {
      setLoading(false);
      console.log(err);
    })
  },[]);

  if(loading) return (
    <div className="container">
      <div className='spacing' />
      <p>Loading...</p>
    </div>
  )

  return (
    <div>
      <div className="home-container">
        <div className="home-info">
          <h1>Selendra Blockchain Explorer</h1>
          <div className="spacing" />
          <Search />
          <div className="spacing" />
          <Overview 
            total_blocks={blockNumber}
            total_blocksFinalized={blockNumberFinalized}
            total_extrinsics={overview?.extrinsic.total_extrinsics}
            total_events={overview?.event.total_event}
            total_accounts={overview?.trxAndAccount.Accounts}
            total_transfers={overview?.trxAndAccount.Transfers}
            total_nominators={overview?.staking.nominatorCount}
            total_validators={validators}
          />
        </div>
      </div>
      <div className="home-info">
        <Row gutter={[16, { xs: 8, sm: 16, md: 24, lg: 32 }]}>
          <Col xs={24} md={12} lg={12} xl={12}>
            <p className="home-subTitle">Latest Blocks</p>
            <BlocksTable short data={overview?.block} />
          </Col>
          <Col xs={24} md={12} lg={12} xl={12}>
            <p className="home-subTitle">Latest Extrinsic</p>
            <ExtrinsicsTable short data={overview?.extrinsic} />
          </Col>
        </Row>
      </div>
    </div>
  );
}
