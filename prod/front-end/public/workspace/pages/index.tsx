import type { NextPage } from 'next';
import Head from 'next/head';
import AvatarExtractor from '../AvatarExtractor';

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Avatar Extractor</title>
        <meta name="description" content="Extract avatars from a 3x3 grid image" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <AvatarExtractor />
      </main>

      <footer>
        <p>
          Avatar Extractor - Extract 9 individual avatars from a 3x3 grid image
        </p>
      </footer>

      <style jsx>{`
        main {
          min-height: 100vh;
          padding: 4rem 0;
        }

        footer {
          display: flex;
          flex: 1;
          padding: 2rem 0;
          border-top: 1px solid #eaeaea;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
      `}</style>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default Home;