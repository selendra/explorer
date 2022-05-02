import React, { useEffect, useState } from "react";
import { Col, Row } from "antd";
import Overview from "../components/Overview";
import BlocksTable from "../components/BlocksTable";
import ExtrinsicsTable from "../components/ExtrinsicsTable";
import Search from "../components/Search";
import { useAPIState } from "../context/APIContext";

export default function Home() {
  const { api } = useAPIState();
  const [blockNumber, setBlockNumber] = useState(0);
  const [overview, setOverview] = useState();

  const bestNumber = api.derive.chain.bestNumber;

  useEffect(() => {
    let unsubscribeAll = null

    bestNumber(number => {
      // Append `.toLocaleString('en-US')` to display a nice thousand-separated digit.
      setBlockNumber(number.toNumber().toLocaleString('en-US'))
    })
      .then(unsub => {
        unsubscribeAll = unsub
      })
      .catch(console.error)

    return () => unsubscribeAll && unsubscribeAll()
  }, [bestNumber])

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.REACT_APP_API}/block/all/1`),
      fetch(`${process.env.REACT_APP_API}/extrinsic/all/1`),
      fetch(`${process.env.REACT_APP_API}/event/all/1`),
      fetch(`${process.env.REACT_APP_API}/account/all/1`),
      fetch(`${process.env.REACT_APP_API}/transfer/all/1`),
      fetch(`${process.env.REACT_APP_API}/staking/status`)
    ])
    .then(async([a, b, c, d, e, f]) => {
      const block = await a.json();
      const extrinsic = await b.json();
      const event = await c.json();
      const account = await d.json();
      const transfer = await e.json();
      const staking = await f.json();

      setOverview({
        block,
        extrinsic,
        event,
        account,
        transfer,
        staking
      })
      return [block, extrinsic, event, account, transfer, staking];
    })
    .catch(err => {
      console.log(err);
    })
  },[blockNumber]);

  return (
    <div>
      <div className="home-container">
        <div className="home-info">
          <h1>Selendra Blockchain Explorer</h1>
          <div className="spacing" />
          <Search />
          <div className="spacing" />
          <Overview 
            total_extrinsics={overview?.extrinsic.total_extrinsics}
            total_events={overview?.event.total_event}
            total_accounts={overview?.account.total_account}
            total_transfers={overview?.transfer.total_transfer}
            total_nominators={overview?.staking.nominatorCount}
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
