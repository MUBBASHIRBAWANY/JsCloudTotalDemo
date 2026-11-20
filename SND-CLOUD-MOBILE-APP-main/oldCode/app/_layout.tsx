import { Stack } from 'expo-router'
import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../Redux/Store/store.js'
const _layout = () => {

  return (
    <Provider store={store}>
      <Stack >

        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name='(drawer)'
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SaleOrderView"
          options={{ headerShown: false }}
        />

      </Stack>
    </Provider>
  )
}

export default _layout