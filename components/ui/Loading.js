import React from 'react'

const Loading = () => {
  return (
    <>
        <div className='z-200 w-screen h-screen flex justify-center items-center fixed bg-black/70'>
            <div className='px-6 py-6 bg-(--bg) flex justify-center items-center rounded-lg'>
                <div className='loading'></div>
            </div>
        </div>
    </>
  )
}

export default Loading