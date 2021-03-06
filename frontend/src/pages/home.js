import { Col, Row } from "antd";
import { useEffect, useState } from "react";
import Search from "../components/Search";
import Overview from "../components/Overview";
import BlocksTable from "../components/BlocksTable";
import TransferTable from "../components/TransferTable";
import { useAPIState } from "../context/APIContext";
import Loading from "../components/Loading";
import bannerImg from "../assets/loading.png";

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

    bestNumber((number) => {
      setBlockNumber(number.toNumber().toLocaleString("en-US"));
    });
    bestNumberFinalized((number) => {
      setBlockNumberFinalized(number.toNumber().toLocaleString("en-US"));
    });
    validatorsData((data) => {
      setValidators(data.toHuman());
    })
      .then((unsub) => {
        unsubscribeAll = unsub;
      })
      .catch(console.error);

    return () => unsubscribeAll && unsubscribeAll();
  }, [bestNumber, bestNumberFinalized, validatorsData]);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.REACT_APP_API}/block/all/1`),
      fetch(`${process.env.REACT_APP_API}/transfer/all/1`),
      fetch(`${process.env.REACT_APP_API}/totals`),
      fetch(`${process.env.REACT_APP_API}/staking/status`),
      fetch(`${process.env.REACT_APP_API}/totals/lock_balances`),
      fetch(`${process.env.REACT_APP_API}/staking/status`),
    ])
      .then(async ([a, b, c, d, e, f]) => {
        const block = await a.json();
        const transfer = await b.json();
        const total = await c.json();
        const staking = await d.json();
        const totalLock = await e.json();
        const waitingCount = await f.json();

        setLoading(false);
        setOverview({
          waitingCount,
          block,
          transfer,
          total,
          staking,
          totalLock,
        });
      })
      .catch((err) => {
        setLoading(false);
        console.log(err);
      });
  }, [blockNumber]);

  if (loading)
    return (
      <div className="container">
        <Loading />
      </div>
    );
  console.log(overview?.waitingCount.waitingValidatorCount);

  return (
    <div>
      <div className="home-container">
        <div className="home-info">
          <h1>Selendra Blocks Explorer</h1>
          <div className="spacing" />
          <Search />
          <div className="spacing" />
          <Overview
            total_blocks={blockNumber}
            total_blocksFinalized={blockNumberFinalized}
            total_extrinsicSigned={overview?.total.SignedExtrinsic}
            total_accounts={overview?.total.Accounts}
            total_transfers={overview?.total.Transfers}
            total_issuance={overview?.block.blocks[0].totalIssuance}
            total_validators={validators.length}
            total_lockBalance={overview?.totalLock.totalLockBalances}
            waitingCount={overview?.waitingCount.waitingValidatorCount}
          />
        </div>
      </div>
      {/* <Loading /> */}
      <div className="home-info">
        <Row gutter={[16, { xs: 8, sm: 16, md: 24, lg: 32 }]}>
          <Col xs={24} md={24} lg={12} xl={12}>
            <p className="home-subTitle">Latest Blocks</p>
            <BlocksTable short data={overview?.block} />
          </Col>
          <Col xs={24} md={24} lg={12} xl={12}>
            <p className="home-subTitle">Latest Transfers</p>
            <TransferTable short data={overview?.transfer} />
          </Col>
        </Row>
      </div>
    </div>
  );
}
