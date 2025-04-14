import React from "react"
import { home } from "../data/dummydata"
import Typewriter from "typewriter-effect"

const Home = () => {
  return (
    <section className='hero'>
      {home.map((val, i) => (
        <div className='heroContent' key={i}>
          <h3 className='fontSize' data-aos='fade-right'>
            {val.text}
          </h3>
          <h1>
            <Typewriter
              options={{
                strings: [`${val.name}`, `${val.post}`, `${val.design}`],
                autoStart: true,
                loop: true,
              }}
            />
          </h1>
          <p data-aos='fade-left'>{val.desc}</p>
          
        </div>
      ))}
    </section>
  )
}

export default Home
