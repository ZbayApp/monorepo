import React from 'react'
import { act } from 'react-dom/test-utils'
import { renderComponent } from '../../testUtils/renderComponent'
import { MathMessageComponent } from './MathMessageComponent'

describe('MathMessageComponent', () => {
  it('renders tex', async () => {
    const result = renderComponent(
      <MathMessageComponent message={'$$a + b = c$$'} messageId={'1'} pending={false} openUrl={() => {}} />
    )
    await act(async () => {})
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <span
            class="MathMessagemessage MathMessagebeginning css-y9v6re"
          >
            <mjx-container
              class="MathJax"
              jax="SVG"
            >
              <svg
                focusable="false"
                height="1.756ex"
                role="img"
                style="vertical-align: -0.186ex;"
                viewBox="0 -694 3947 776"
                width="8.93ex"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-width="0"
                  transform="scale(1,-1)"
                >
                  <g
                    data-mml-node="math"
                  >
                    <g
                      data-mml-node="mi"
                    >
                      <path
                        d="M33 157Q33 258 109 349T280 441Q331 441 370 392Q386 422 416 422Q429 422 439 414T449 394Q449 381 412 234T374 68Q374 43 381 35T402 26Q411 27 422 35Q443 55 463 131Q469 151 473 152Q475 153 483 153H487Q506 153 506 144Q506 138 501 117T481 63T449 13Q436 0 417 -8Q409 -10 393 -10Q359 -10 336 5T306 36L300 51Q299 52 296 50Q294 48 292 46Q233 -10 172 -10Q117 -10 75 30T33 157ZM351 328Q351 334 346 350T323 385T277 405Q242 405 210 374T160 293Q131 214 119 129Q119 126 119 118T118 106Q118 61 136 44T179 26Q217 26 254 59T298 110Q300 114 325 217T351 328Z"
                        data-c="1D44E"
                      />
                    </g>
                    <g
                      data-mml-node="mo"
                      transform="translate(751.2,0)"
                    >
                      <path
                        d="M56 237T56 250T70 270H369V420L370 570Q380 583 389 583Q402 583 409 568V270H707Q722 262 722 250T707 230H409V-68Q401 -82 391 -82H389H387Q375 -82 369 -68V230H70Q56 237 56 250Z"
                        data-c="2B"
                      />
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(1751.4,0)"
                    >
                      <path
                        d="M73 647Q73 657 77 670T89 683Q90 683 161 688T234 694Q246 694 246 685T212 542Q204 508 195 472T180 418L176 399Q176 396 182 402Q231 442 283 442Q345 442 383 396T422 280Q422 169 343 79T173 -11Q123 -11 82 27T40 150V159Q40 180 48 217T97 414Q147 611 147 623T109 637Q104 637 101 637H96Q86 637 83 637T76 640T73 647ZM336 325V331Q336 405 275 405Q258 405 240 397T207 376T181 352T163 330L157 322L136 236Q114 150 114 114Q114 66 138 42Q154 26 178 26Q211 26 245 58Q270 81 285 114T318 219Q336 291 336 325Z"
                        data-c="1D44F"
                      />
                    </g>
                    <g
                      data-mml-node="mo"
                      transform="translate(2458.2,0)"
                    >
                      <path
                        d="M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z"
                        data-c="3D"
                      />
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(3514,0)"
                    >
                      <path
                        d="M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z"
                        data-c="1D450"
                      />
                    </g>
                  </g>
                </g>
              </svg>
            </mjx-container>
          </span>
        </div>
      </body>
    `)
  })
  it('renders message with regular text message and svg math formula', async () => {
    const onMathMessageRendered = jest.fn()
    // jest.spyOn()
    const result = renderComponent(
      <MathMessageComponent
        message={'It is $$a + b = c$$ and $$a - b = d$$'}
        messageId={'1'}
        pending={false}
        openUrl={() => {}}
        onMathMessageRendered={onMathMessageRendered}
      />
    )
    await act(async () => {})
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <span
            class="MuiTypography-root MuiTypography-body1 TextMessagemessage css-llt4u8-MuiTypography-root"
            data-testid="messagesGroupContent-1-0"
          >
            It is
          </span>
          <span
            class="MathMessagemessage MathMessagemiddle css-y9v6re"
          >
            <mjx-container
              class="MathJax"
              jax="SVG"
            >
              <svg
                focusable="false"
                height="1.756ex"
                role="img"
                style="vertical-align: -0.186ex;"
                viewBox="0 -694 3947 776"
                width="8.93ex"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-width="0"
                  transform="scale(1,-1)"
                >
                  <g
                    data-mml-node="math"
                  >
                    <g
                      data-mml-node="mi"
                    >
                      <path
                        d="M33 157Q33 258 109 349T280 441Q331 441 370 392Q386 422 416 422Q429 422 439 414T449 394Q449 381 412 234T374 68Q374 43 381 35T402 26Q411 27 422 35Q443 55 463 131Q469 151 473 152Q475 153 483 153H487Q506 153 506 144Q506 138 501 117T481 63T449 13Q436 0 417 -8Q409 -10 393 -10Q359 -10 336 5T306 36L300 51Q299 52 296 50Q294 48 292 46Q233 -10 172 -10Q117 -10 75 30T33 157ZM351 328Q351 334 346 350T323 385T277 405Q242 405 210 374T160 293Q131 214 119 129Q119 126 119 118T118 106Q118 61 136 44T179 26Q217 26 254 59T298 110Q300 114 325 217T351 328Z"
                        data-c="1D44E"
                      />
                    </g>
                    <g
                      data-mml-node="mo"
                      transform="translate(751.2,0)"
                    >
                      <path
                        d="M56 237T56 250T70 270H369V420L370 570Q380 583 389 583Q402 583 409 568V270H707Q722 262 722 250T707 230H409V-68Q401 -82 391 -82H389H387Q375 -82 369 -68V230H70Q56 237 56 250Z"
                        data-c="2B"
                      />
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(1751.4,0)"
                    >
                      <path
                        d="M73 647Q73 657 77 670T89 683Q90 683 161 688T234 694Q246 694 246 685T212 542Q204 508 195 472T180 418L176 399Q176 396 182 402Q231 442 283 442Q345 442 383 396T422 280Q422 169 343 79T173 -11Q123 -11 82 27T40 150V159Q40 180 48 217T97 414Q147 611 147 623T109 637Q104 637 101 637H96Q86 637 83 637T76 640T73 647ZM336 325V331Q336 405 275 405Q258 405 240 397T207 376T181 352T163 330L157 322L136 236Q114 150 114 114Q114 66 138 42Q154 26 178 26Q211 26 245 58Q270 81 285 114T318 219Q336 291 336 325Z"
                        data-c="1D44F"
                      />
                    </g>
                    <g
                      data-mml-node="mo"
                      transform="translate(2458.2,0)"
                    >
                      <path
                        d="M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z"
                        data-c="3D"
                      />
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(3514,0)"
                    >
                      <path
                        d="M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z"
                        data-c="1D450"
                      />
                    </g>
                  </g>
                </g>
              </svg>
            </mjx-container>
          </span>
          <span
            class="MuiTypography-root MuiTypography-body1 TextMessagemessage css-llt4u8-MuiTypography-root"
            data-testid="messagesGroupContent-1-2"
          >
            and
          </span>
          <span
            class="MathMessagemessage MathMessagemiddle css-y9v6re"
          >
            <mjx-container
              class="MathJax"
              jax="SVG"
            >
              <svg
                focusable="false"
                height="1.756ex"
                role="img"
                style="vertical-align: -0.186ex;"
                viewBox="0 -694 4034 776"
                width="9.127ex"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-width="0"
                  transform="scale(1,-1)"
                >
                  <g
                    data-mml-node="math"
                  >
                    <g
                      data-mml-node="mi"
                    >
                      <path
                        d="M33 157Q33 258 109 349T280 441Q331 441 370 392Q386 422 416 422Q429 422 439 414T449 394Q449 381 412 234T374 68Q374 43 381 35T402 26Q411 27 422 35Q443 55 463 131Q469 151 473 152Q475 153 483 153H487Q506 153 506 144Q506 138 501 117T481 63T449 13Q436 0 417 -8Q409 -10 393 -10Q359 -10 336 5T306 36L300 51Q299 52 296 50Q294 48 292 46Q233 -10 172 -10Q117 -10 75 30T33 157ZM351 328Q351 334 346 350T323 385T277 405Q242 405 210 374T160 293Q131 214 119 129Q119 126 119 118T118 106Q118 61 136 44T179 26Q217 26 254 59T298 110Q300 114 325 217T351 328Z"
                        data-c="1D44E"
                      />
                    </g>
                    <g
                      data-mml-node="mo"
                      transform="translate(751.2,0)"
                    >
                      <path
                        d="M84 237T84 250T98 270H679Q694 262 694 250T679 230H98Q84 237 84 250Z"
                        data-c="2212"
                      />
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(1751.4,0)"
                    >
                      <path
                        d="M73 647Q73 657 77 670T89 683Q90 683 161 688T234 694Q246 694 246 685T212 542Q204 508 195 472T180 418L176 399Q176 396 182 402Q231 442 283 442Q345 442 383 396T422 280Q422 169 343 79T173 -11Q123 -11 82 27T40 150V159Q40 180 48 217T97 414Q147 611 147 623T109 637Q104 637 101 637H96Q86 637 83 637T76 640T73 647ZM336 325V331Q336 405 275 405Q258 405 240 397T207 376T181 352T163 330L157 322L136 236Q114 150 114 114Q114 66 138 42Q154 26 178 26Q211 26 245 58Q270 81 285 114T318 219Q336 291 336 325Z"
                        data-c="1D44F"
                      />
                    </g>
                    <g
                      data-mml-node="mo"
                      transform="translate(2458.2,0)"
                    >
                      <path
                        d="M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z"
                        data-c="3D"
                      />
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(3514,0)"
                    >
                      <path
                        d="M366 683Q367 683 438 688T511 694Q523 694 523 686Q523 679 450 384T375 83T374 68Q374 26 402 26Q411 27 422 35Q443 55 463 131Q469 151 473 152Q475 153 483 153H487H491Q506 153 506 145Q506 140 503 129Q490 79 473 48T445 8T417 -8Q409 -10 393 -10Q359 -10 336 5T306 36L300 51Q299 52 296 50Q294 48 292 46Q233 -10 172 -10Q117 -10 75 30T33 157Q33 205 53 255T101 341Q148 398 195 420T280 442Q336 442 364 400Q369 394 369 396Q370 400 396 505T424 616Q424 629 417 632T378 637H357Q351 643 351 645T353 664Q358 683 366 683ZM352 326Q329 405 277 405Q242 405 210 374T160 293Q131 214 119 129Q119 126 119 118T118 106Q118 61 136 44T179 26Q233 26 290 98L298 109L352 326Z"
                        data-c="1D451"
                      />
                    </g>
                  </g>
                </g>
              </svg>
            </mjx-container>
          </span>
        </div>
      </body>
    `)
    expect(onMathMessageRendered).toBeCalledTimes(2)
  })
  it('renders pending message with regular text message and svg math formula', async () => {
    const onMathMessageRendered = jest.fn()
    const result = renderComponent(
      <MathMessageComponent
        message={String.raw`$$sum_{i=0}^n i = \frac{n(n+1)}{2}$$ - look`}
        messageId={'1'}
        pending={false}
        openUrl={() => {}}
        onMathMessageRendered={onMathMessageRendered}
      />
    )
    await act(async () => {})
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <span
            class="MathMessagemessage MathMessagebeginning css-y9v6re"
          >
            <mjx-container
              class="MathJax"
              jax="SVG"
            >
              <svg
                focusable="false"
                height="3.169ex"
                role="img"
                style="vertical-align: -0.8ex;"
                viewBox="0 -1047.1 7570.5 1400.8"
                width="17.128ex"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-width="0"
                  transform="scale(1,-1)"
                >
                  <g
                    data-mml-node="math"
                  >
                    <g
                      data-mml-node="mi"
                    >
                      <path
                        d="M131 289Q131 321 147 354T203 415T300 442Q362 442 390 415T419 355Q419 323 402 308T364 292Q351 292 340 300T328 326Q328 342 337 354T354 372T367 378Q368 378 368 379Q368 382 361 388T336 399T297 405Q249 405 227 379T204 326Q204 301 223 291T278 274T330 259Q396 230 396 163Q396 135 385 107T352 51T289 7T195 -10Q118 -10 86 19T53 87Q53 126 74 143T118 160Q133 160 146 151T160 120Q160 94 142 76T111 58Q109 57 108 57T107 55Q108 52 115 47T146 34T201 27Q237 27 263 38T301 66T318 97T323 122Q323 150 302 164T254 181T195 196T148 231Q131 256 131 289Z"
                        data-c="1D460"
                      />
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(469,0)"
                    >
                      <path
                        d="M21 287Q21 295 30 318T55 370T99 420T158 442Q204 442 227 417T250 358Q250 340 216 246T182 105Q182 62 196 45T238 27T291 44T328 78L339 95Q341 99 377 247Q407 367 413 387T427 416Q444 431 463 431Q480 431 488 421T496 402L420 84Q419 79 419 68Q419 43 426 35T447 26Q469 29 482 57T512 145Q514 153 532 153Q551 153 551 144Q550 139 549 130T540 98T523 55T498 17T462 -8Q454 -10 438 -10Q372 -10 347 46Q345 45 336 36T318 21T296 6T267 -6T233 -11Q189 -11 155 7Q103 38 103 113Q103 170 138 262T173 379Q173 380 173 381Q173 390 173 393T169 400T158 404H154Q131 404 112 385T82 344T65 302T57 280Q55 278 41 278H27Q21 284 21 287Z"
                        data-c="1D462"
                      />
                    </g>
                    <g
                      data-mml-node="msubsup"
                      transform="translate(1041,0)"
                    >
                      <g
                        data-mml-node="mi"
                      >
                        <path
                          d="M21 287Q22 293 24 303T36 341T56 388T88 425T132 442T175 435T205 417T221 395T229 376L231 369Q231 367 232 367L243 378Q303 442 384 442Q401 442 415 440T441 433T460 423T475 411T485 398T493 385T497 373T500 364T502 357L510 367Q573 442 659 442Q713 442 746 415T780 336Q780 285 742 178T704 50Q705 36 709 31T724 26Q752 26 776 56T815 138Q818 149 821 151T837 153Q857 153 857 145Q857 144 853 130Q845 101 831 73T785 17T716 -10Q669 -10 648 17T627 73Q627 92 663 193T700 345Q700 404 656 404H651Q565 404 506 303L499 291L466 157Q433 26 428 16Q415 -11 385 -11Q372 -11 364 -4T353 8T350 18Q350 29 384 161L420 307Q423 322 423 345Q423 404 379 404H374Q288 404 229 303L222 291L189 157Q156 26 151 16Q138 -11 108 -11Q95 -11 87 -5T76 7T74 17Q74 30 112 181Q151 335 151 342Q154 357 154 369Q154 405 129 405Q107 405 92 377T69 316T57 280Q55 278 41 278H27Q21 284 21 287Z"
                          data-c="1D45A"
                        />
                      </g>
                      <g
                        data-mml-node="mi"
                        transform="translate(911,363) scale(0.707)"
                      >
                        <path
                          d="M21 287Q22 293 24 303T36 341T56 388T89 425T135 442Q171 442 195 424T225 390T231 369Q231 367 232 367L243 378Q304 442 382 442Q436 442 469 415T503 336T465 179T427 52Q427 26 444 26Q450 26 453 27Q482 32 505 65T540 145Q542 153 560 153Q580 153 580 145Q580 144 576 130Q568 101 554 73T508 17T439 -10Q392 -10 371 17T350 73Q350 92 386 193T423 345Q423 404 379 404H374Q288 404 229 303L222 291L189 157Q156 26 151 16Q138 -11 108 -11Q95 -11 87 -5T76 7T74 17Q74 30 112 180T152 343Q153 348 153 366Q153 405 129 405Q91 405 66 305Q60 285 60 284Q58 278 41 278H27Q21 284 21 287Z"
                          data-c="1D45B"
                        />
                      </g>
                      <g
                        data-mjx-texclass="ORD"
                        data-mml-node="TeXAtom"
                        transform="translate(911,-295.7) scale(0.707)"
                      >
                        <g
                          data-mml-node="mi"
                        >
                          <path
                            d="M184 600Q184 624 203 642T247 661Q265 661 277 649T290 619Q290 596 270 577T226 557Q211 557 198 567T184 600ZM21 287Q21 295 30 318T54 369T98 420T158 442Q197 442 223 419T250 357Q250 340 236 301T196 196T154 83Q149 61 149 51Q149 26 166 26Q175 26 185 29T208 43T235 78T260 137Q263 149 265 151T282 153Q302 153 302 143Q302 135 293 112T268 61T223 11T161 -11Q129 -11 102 10T74 74Q74 91 79 106T122 220Q160 321 166 341T173 380Q173 404 156 404H154Q124 404 99 371T61 287Q60 286 59 284T58 281T56 279T53 278T49 278T41 278H27Q21 284 21 287Z"
                            data-c="1D456"
                          />
                        </g>
                        <g
                          data-mml-node="mo"
                          transform="translate(345,0)"
                        >
                          <path
                            d="M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z"
                            data-c="3D"
                          />
                        </g>
                        <g
                          data-mml-node="mn"
                          transform="translate(1123,0)"
                        >
                          <path
                            d="M96 585Q152 666 249 666Q297 666 345 640T423 548Q460 465 460 320Q460 165 417 83Q397 41 362 16T301 -15T250 -22Q224 -22 198 -16T137 16T82 83Q39 165 39 320Q39 494 96 585ZM321 597Q291 629 250 629Q208 629 178 597Q153 571 145 525T137 333Q137 175 145 125T181 46Q209 16 250 16Q290 16 318 46Q347 76 354 130T362 333Q362 478 354 524T321 597Z"
                            data-c="30"
                          />
                        </g>
                      </g>
                    </g>
                    <g
                      data-mml-node="mi"
                      transform="translate(3149.6,0)"
                    >
                      <path
                        d="M184 600Q184 624 203 642T247 661Q265 661 277 649T290 619Q290 596 270 577T226 557Q211 557 198 567T184 600ZM21 287Q21 295 30 318T54 369T98 420T158 442Q197 442 223 419T250 357Q250 340 236 301T196 196T154 83Q149 61 149 51Q149 26 166 26Q175 26 185 29T208 43T235 78T260 137Q263 149 265 151T282 153Q302 153 302 143Q302 135 293 112T268 61T223 11T161 -11Q129 -11 102 10T74 74Q74 91 79 106T122 220Q160 321 166 341T173 380Q173 404 156 404H154Q124 404 99 371T61 287Q60 286 59 284T58 281T56 279T53 278T49 278T41 278H27Q21 284 21 287Z"
                        data-c="1D456"
                      />
                    </g>
                    <g
                      data-mml-node="mo"
                      transform="translate(3772.4,0)"
                    >
                      <path
                        d="M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z"
                        data-c="3D"
                      />
                    </g>
                    <g
                      data-mml-node="mfrac"
                      transform="translate(4828.2,0)"
                    >
                      <g
                        data-mml-node="mrow"
                        transform="translate(220,516.8) scale(0.707)"
                      >
                        <g
                          data-mml-node="mi"
                        >
                          <path
                            d="M21 287Q22 293 24 303T36 341T56 388T89 425T135 442Q171 442 195 424T225 390T231 369Q231 367 232 367L243 378Q304 442 382 442Q436 442 469 415T503 336T465 179T427 52Q427 26 444 26Q450 26 453 27Q482 32 505 65T540 145Q542 153 560 153Q580 153 580 145Q580 144 576 130Q568 101 554 73T508 17T439 -10Q392 -10 371 17T350 73Q350 92 386 193T423 345Q423 404 379 404H374Q288 404 229 303L222 291L189 157Q156 26 151 16Q138 -11 108 -11Q95 -11 87 -5T76 7T74 17Q74 30 112 180T152 343Q153 348 153 366Q153 405 129 405Q91 405 66 305Q60 285 60 284Q58 278 41 278H27Q21 284 21 287Z"
                            data-c="1D45B"
                          />
                        </g>
                        <g
                          data-mml-node="mo"
                          transform="translate(600,0)"
                        >
                          <path
                            d="M94 250Q94 319 104 381T127 488T164 576T202 643T244 695T277 729T302 750H315H319Q333 750 333 741Q333 738 316 720T275 667T226 581T184 443T167 250T184 58T225 -81T274 -167T316 -220T333 -241Q333 -250 318 -250H315H302L274 -226Q180 -141 137 -14T94 250Z"
                            data-c="28"
                          />
                        </g>
                        <g
                          data-mml-node="mi"
                          transform="translate(989,0)"
                        >
                          <path
                            d="M21 287Q22 293 24 303T36 341T56 388T89 425T135 442Q171 442 195 424T225 390T231 369Q231 367 232 367L243 378Q304 442 382 442Q436 442 469 415T503 336T465 179T427 52Q427 26 444 26Q450 26 453 27Q482 32 505 65T540 145Q542 153 560 153Q580 153 580 145Q580 144 576 130Q568 101 554 73T508 17T439 -10Q392 -10 371 17T350 73Q350 92 386 193T423 345Q423 404 379 404H374Q288 404 229 303L222 291L189 157Q156 26 151 16Q138 -11 108 -11Q95 -11 87 -5T76 7T74 17Q74 30 112 180T152 343Q153 348 153 366Q153 405 129 405Q91 405 66 305Q60 285 60 284Q58 278 41 278H27Q21 284 21 287Z"
                            data-c="1D45B"
                          />
                        </g>
                        <g
                          data-mml-node="mo"
                          transform="translate(1589,0)"
                        >
                          <path
                            d="M56 237T56 250T70 270H369V420L370 570Q380 583 389 583Q402 583 409 568V270H707Q722 262 722 250T707 230H409V-68Q401 -82 391 -82H389H387Q375 -82 369 -68V230H70Q56 237 56 250Z"
                            data-c="2B"
                          />
                        </g>
                        <g
                          data-mml-node="mn"
                          transform="translate(2367,0)"
                        >
                          <path
                            d="M213 578L200 573Q186 568 160 563T102 556H83V602H102Q149 604 189 617T245 641T273 663Q275 666 285 666Q294 666 302 660V361L303 61Q310 54 315 52T339 48T401 46H427V0H416Q395 3 257 3Q121 3 100 0H88V46H114Q136 46 152 46T177 47T193 50T201 52T207 57T213 61V578Z"
                            data-c="31"
                          />
                        </g>
                        <g
                          data-mml-node="mo"
                          transform="translate(2867,0)"
                        >
                          <path
                            d="M60 749L64 750Q69 750 74 750H86L114 726Q208 641 251 514T294 250Q294 182 284 119T261 12T224 -76T186 -143T145 -194T113 -227T90 -246Q87 -249 86 -250H74Q66 -250 63 -250T58 -247T55 -238Q56 -237 66 -225Q221 -64 221 250T66 725Q56 737 55 738Q55 746 60 749Z"
                            data-c="29"
                          />
                        </g>
                      </g>
                      <g
                        data-mml-node="mn"
                        transform="translate(1194.4,-345) scale(0.707)"
                      >
                        <path
                          d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z"
                          data-c="32"
                        />
                      </g>
                      <rect
                        height="60"
                        width="2502.3"
                        x="120"
                        y="220"
                      />
                    </g>
                  </g>
                </g>
              </svg>
            </mjx-container>
          </span>
          <span
            class="MuiTypography-root MuiTypography-body1 TextMessagemessage css-llt4u8-MuiTypography-root"
            data-testid="messagesGroupContent-1-1"
          >
            <ul
              class="TextMessageul"
              depth="0"
            >
              

              <li>
                look
              </li>
              

            </ul>
          </span>
        </div>
      </body>
    `)
    expect(onMathMessageRendered).toBeCalledTimes(1)
  })
})
