import { Link } from 'react-router';

const Home = () => {
  return (
    <>
      <h1 className="text-2xl font-bold">Hello World</h1>
      <Link className="text-blue-500 font-bold" to="/settings">Settings</Link>
    </>
  );
};

export { Home };