import { Link } from 'react-router';

const Home = () => {
  return (
    <>
      <h1>Hello World</h1>
      <Link to="/settings">Settings</Link>
    </>
  );
};

export { Home };