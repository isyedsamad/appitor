import React from 'react'

const Loading = () => {
  return (
    <>
        <div className='z-200 w-screen h-[100dvh] flex justify-center items-center fixed bg-black/50 backdrop-blur-sm'>
            <div className='px-6 py-6 bg-(--bg) flex justify-center items-center rounded-lg'>
                <div className='loading'></div>
            </div>
        </div>
    </>
  )
}

export default Loading