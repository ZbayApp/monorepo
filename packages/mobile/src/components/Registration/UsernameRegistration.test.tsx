import React from 'react'
import { renderComponent } from '../../utils/functions/renderComponent/renderComponent'
import { UsernameRegistration } from './UsernameRegistration.component'
import { UsernameVariant } from './UsernameRegistration.types'

describe('UsernameRegistration', () => {
  it('UsernameVariant.NEW,', () => {
    const { toJSON } = renderComponent(
      <UsernameRegistration
        variant={UsernameVariant.NEW}
        registerUsernameAction={jest.fn()}
        usernameRegistered={false}
        fetching={false}
      />
    )

    expect(toJSON()).toMatchInlineSnapshot(`
      <View
        style={
          {
            "backgroundColor": "#ffffff",
            "flex": 1,
          }
        }
        testID="username-registration-component"
      >
        <View
          onLayout={[Function]}
          style={
            {
              "flex": 1,
              "justifyContent": "center",
              "paddingLeft": 20,
              "paddingRight": 20,
            }
          }
        >
          <Text
            color="main"
            fontSize={24}
            fontWeight="medium"
            horizontalTextAlign="left"
            style={
              [
                {
                  "color": "#000000",
                  "fontFamily": "Rubik-Medium",
                  "fontSize": 24,
                  "textAlign": "left",
                  "textAlignVertical": "center",
                },
                {
                  "marginBottom": 30,
                },
              ]
            }
            verticalTextAlign="center"
          >
            Register a username
          </Text>
          <View>
            <Text
              color="main"
              fontSize={14}
              horizontalTextAlign="left"
              style={
                [
                  {
                    "color": "#000000",
                    "fontFamily": "Rubik-Regular",
                    "fontSize": 14,
                    "textAlign": "left",
                    "textAlignVertical": "center",
                  },
                  {
                    "color": "#4C4C4C",
                    "paddingBottom": 10,
                  },
                ]
              }
              verticalTextAlign="center"
            >
              Choose your favorite username
            </Text>
            <View
              accessibilityState={
                {
                  "busy": undefined,
                  "checked": undefined,
                  "disabled": false,
                  "expanded": undefined,
                  "selected": undefined,
                }
              }
              accessibilityValue={
                {
                  "max": undefined,
                  "min": undefined,
                  "now": undefined,
                  "text": undefined,
                }
              }
              accessible={true}
              collapsable={false}
              focusable={true}
              onBlur={[Function]}
              onClick={[Function]}
              onFocus={[Function]}
              onResponderGrant={[Function]}
              onResponderMove={[Function]}
              onResponderRelease={[Function]}
              onResponderTerminate={[Function]}
              onResponderTerminationRequest={[Function]}
              onStartShouldSetResponder={[Function]}
              round={false}
              style={
                [
                  {
                    "backgroundColor": "#ffffff",
                    "borderColor": "#C4C4C4",
                    "borderRadius": 4,
                    "borderWidth": 1,
                    "flexGrow": 1,
                    "height": 56,
                    "justifyContent": "center",
                    "paddingLeft": 16,
                    "paddingRight": 16,
                  },
                  {
                    "height": 54,
                  },
                ]
              }
            >
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={true}
                height={54}
                maxLength={20}
                onChangeText={[Function]}
                onContentSizeChange={[Function]}
                placeholder="Enter a username"
                style={
                  [
                    {
                      "height": 54,
                      "paddingBottom": 12,
                      "paddingTop": 12,
                      "textAlignVertical": "center",
                    },
                  ]
                }
                testID="input"
              />
            </View>
            <Text
              color="hint"
              fontSize={14}
              horizontalTextAlign="left"
              style={
                [
                  {
                    "color": "#999999",
                    "fontFamily": "Rubik-Regular",
                    "fontSize": 14,
                    "textAlign": "left",
                    "textAlignVertical": "center",
                  },
                  {
                    "lineHeight": 16,
                    "paddingTop": 10,
                  },
                ]
              }
              verticalTextAlign="center"
            >
              Your username cannot have any spaces or special characters, must be lowercase letters and numbers only.
            </Text>
          </View>
          <View
            style={
              {
                "marginTop": 20,
              }
            }
          >
            <View
              accessibilityState={
                {
                  "busy": undefined,
                  "checked": undefined,
                  "disabled": undefined,
                  "expanded": undefined,
                  "selected": undefined,
                }
              }
              accessible={true}
              focusable={true}
              onClick={[Function]}
              onResponderGrant={[Function]}
              onResponderMove={[Function]}
              onResponderRelease={[Function]}
              onResponderTerminate={[Function]}
              onResponderTerminationRequest={[Function]}
              onStartShouldSetResponder={[Function]}
              style={
                {
                  "alignItems": "center",
                  "backgroundColor": "#521C74",
                  "borderRadius": 8,
                  "justifyContent": "center",
                  "marginVertical": 12,
                  "minHeight": 45,
                  "paddingVertical": 12,
                  "width": undefined,
                }
              }
              testID="button"
            >
              <Text
                color="white"
                fontSize={14}
                horizontalTextAlign="left"
                style={
                  [
                    {
                      "color": "#ffffff",
                      "fontFamily": "Rubik-Regular",
                      "fontSize": 14,
                      "textAlign": "left",
                      "textAlignVertical": "center",
                    },
                  ]
                }
                verticalTextAlign="center"
              >
                Continue
              </Text>
            </View>
          </View>
        </View>
      </View>
    `)
  })

  it('UsernameVariant.TAKEN,', () => {
    const { toJSON } = renderComponent(
      <UsernameRegistration
        registerUsernameAction={jest.fn()}
        usernameRegistered={false}
        fetching={false}
        variant={UsernameVariant.TAKEN}
        handleBackButton={jest.fn()}
        currentUsername={'john'}
        registeredUsers={{
          'BCidRGCBqBPNGNrZ1oml99/qtHjZ6ZtliVzJPpReZk9YC6+aQ1zeooOlpyzv7rNG6nMX2R5ffaVkZZFgEMdNEBg=': {
            onionAddress: 'zpu47hphczcuyt3auu5pr2knvimf3adm76gt3g7zbspungjbm3tsy3ad.onion',
            peerId: '12D3KooWHgLdRMqkepNiYnrur21cyASUNk1f9NZ5tuGa9He8QXNa',
            username: 'owner',
          },
          'BJ50trLih9tvIznBAi69dLNpBV5YiQHCU610UfH3Qm9t3cki9QHWAAhvrfOX+763BH1fwqkOU3JsoBAEF1+USvM=': {
            onionAddress: 'lr5d3d64p4hx4mw3uue3ufews23jhl6bfqnsimt7j52igjqdv2zrmsyd.onion',
            peerId: '12D3KooWPYjyHnYYwe3kzEESMVbpAUHkQyEQpRHehH8QYtGRntVn',
            username: 'johnny',
          },
        }}
      />
    )

    expect(toJSON()).toMatchInlineSnapshot(`
      <View
        style={
          {
            "backgroundColor": "#ffffff",
            "flex": 1,
          }
        }
        testID="username-registration-component"
      >
        <View
          style={
            [
              {
                "alignItems": "center",
                "backgroundColor": "#ffffff",
                "borderBottomColor": "#F0F0F0",
                "borderBottomWidth": 1,
                "display": "flex",
                "flexDirection": "row",
                "justifyContent": "center",
                "maxHeight": 52,
                "minHeight": 52,
              },
            ]
          }
        >
          <View
            style={
              {
                "flex": 1,
              }
            }
          >
            <View
              accessibilityState={
                {
                  "busy": undefined,
                  "checked": undefined,
                  "disabled": undefined,
                  "expanded": undefined,
                  "selected": undefined,
                }
              }
              accessibilityValue={
                {
                  "max": undefined,
                  "min": undefined,
                  "now": undefined,
                  "text": undefined,
                }
              }
              accessible={true}
              collapsable={false}
              focusable={true}
              onClick={[Function]}
              onResponderGrant={[Function]}
              onResponderMove={[Function]}
              onResponderRelease={[Function]}
              onResponderTerminate={[Function]}
              onResponderTerminationRequest={[Function]}
              onStartShouldSetResponder={[Function]}
              style={
                {
                  "opacity": 1,
                }
              }
              testID="appbar_action_item"
            >
              <View
                style={
                  {
                    "alignItems": "center",
                    "height": 50,
                    "justifyContent": "center",
                    "width": 64,
                  }
                }
              >
                <Image
                  resizeMethod="resize"
                  resizeMode="cover"
                  source={
                    {
                      "testUri": "../../../assets/icons/icon_close.png",
                    }
                  }
                  style={
                    {
                      "height": 16,
                      "width": 16,
                    }
                  }
                />
              </View>
            </View>
          </View>
          <View
            style={
              {
                "alignItems": "center",
                "flex": 4,
              }
            }
          >
            <Text
              color="main"
              fontSize={16}
              fontWeight="medium"
              horizontalTextAlign="left"
              style={
                [
                  {
                    "color": "#000000",
                    "fontFamily": "Rubik-Medium",
                    "fontSize": 16,
                    "textAlign": "left",
                    "textAlignVertical": "center",
                  },
                ]
              }
              verticalTextAlign="center"
            >
              Username taken
            </Text>
          </View>
          <View
            style={
              {
                "flex": 1,
              }
            }
          />
        </View>
        <View
          onLayout={[Function]}
          style={
            {
              "flex": 1,
              "justifyContent": "flex-start",
              "paddingLeft": 20,
              "paddingRight": 20,
            }
          }
        >
          <Text
            color="main"
            fontSize={14}
            horizontalTextAlign="left"
            style={
              [
                {
                  "color": "#000000",
                  "fontFamily": "Rubik-Regular",
                  "fontSize": 14,
                  "textAlign": "left",
                  "textAlignVertical": "center",
                },
                {
                  "marginBottom": 30,
                  "marginTop": 30,
                },
              ]
            }
            verticalTextAlign="center"
          >
            We’re sorry, but the username
             
            <Text
              color="main"
              fontSize={14}
              fontWeight="medium"
              horizontalTextAlign="left"
              style={
                [
                  {
                    "color": "#000000",
                    "fontFamily": "Rubik-Medium",
                    "fontSize": 14,
                    "textAlign": "left",
                    "textAlignVertical": "center",
                  },
                ]
              }
              verticalTextAlign="center"
            >
              @john
            </Text>
             was already claimed by someone else. Can you choose another name?
          </Text>
          <View>
            <Text
              color="main"
              fontSize={14}
              horizontalTextAlign="left"
              style={
                [
                  {
                    "color": "#000000",
                    "fontFamily": "Rubik-Regular",
                    "fontSize": 14,
                    "textAlign": "left",
                    "textAlignVertical": "center",
                  },
                  {
                    "color": "#4C4C4C",
                    "paddingBottom": 10,
                  },
                ]
              }
              verticalTextAlign="center"
            >
              Enter a username
            </Text>
            <View
              accessibilityState={
                {
                  "busy": undefined,
                  "checked": undefined,
                  "disabled": false,
                  "expanded": undefined,
                  "selected": undefined,
                }
              }
              accessibilityValue={
                {
                  "max": undefined,
                  "min": undefined,
                  "now": undefined,
                  "text": undefined,
                }
              }
              accessible={true}
              collapsable={false}
              focusable={true}
              onBlur={[Function]}
              onClick={[Function]}
              onFocus={[Function]}
              onResponderGrant={[Function]}
              onResponderMove={[Function]}
              onResponderRelease={[Function]}
              onResponderTerminate={[Function]}
              onResponderTerminationRequest={[Function]}
              onStartShouldSetResponder={[Function]}
              round={false}
              style={
                [
                  {
                    "backgroundColor": "#ffffff",
                    "borderColor": "#C4C4C4",
                    "borderRadius": 4,
                    "borderWidth": 1,
                    "flexGrow": 1,
                    "height": 56,
                    "justifyContent": "center",
                    "paddingLeft": 16,
                    "paddingRight": 16,
                  },
                  {
                    "height": 54,
                  },
                ]
              }
            >
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={true}
                height={54}
                maxLength={20}
                onChangeText={[Function]}
                onContentSizeChange={[Function]}
                placeholder="Username"
                style={
                  [
                    {
                      "height": 54,
                      "paddingBottom": 12,
                      "paddingTop": 12,
                      "textAlignVertical": "center",
                    },
                  ]
                }
                testID="input"
              />
            </View>
            <Text
              color="hint"
              fontSize={14}
              horizontalTextAlign="left"
              style={
                [
                  {
                    "color": "#999999",
                    "fontFamily": "Rubik-Regular",
                    "fontSize": 14,
                    "textAlign": "left",
                    "textAlignVertical": "center",
                  },
                  {
                    "lineHeight": 16,
                    "paddingTop": 10,
                  },
                ]
              }
              verticalTextAlign="center"
            >
              Your username will be public, but you can choose any name you like. No spaces or special characters. Lowercase letters and numbers only.
            </Text>
          </View>
          <View
            style={
              {
                "marginTop": 20,
              }
            }
          >
            <View
              accessibilityState={
                {
                  "busy": undefined,
                  "checked": undefined,
                  "disabled": undefined,
                  "expanded": undefined,
                  "selected": undefined,
                }
              }
              accessible={true}
              focusable={true}
              onClick={[Function]}
              onResponderGrant={[Function]}
              onResponderMove={[Function]}
              onResponderRelease={[Function]}
              onResponderTerminate={[Function]}
              onResponderTerminationRequest={[Function]}
              onStartShouldSetResponder={[Function]}
              style={
                {
                  "alignItems": "center",
                  "backgroundColor": "#521C74",
                  "borderRadius": 8,
                  "justifyContent": "center",
                  "marginVertical": 12,
                  "minHeight": 45,
                  "paddingVertical": 12,
                  "width": 100,
                }
              }
              testID="button"
            >
              <Text
                color="white"
                fontSize={14}
                horizontalTextAlign="left"
                style={
                  [
                    {
                      "color": "#ffffff",
                      "fontFamily": "Rubik-Regular",
                      "fontSize": 14,
                      "textAlign": "left",
                      "textAlignVertical": "center",
                    },
                  ]
                }
                verticalTextAlign="center"
              >
                Continue
              </Text>
            </View>
          </View>
        </View>
      </View>
    `)
  })
})
