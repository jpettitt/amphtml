/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AmpDocSingle} from '../../../../src/service/ampdoc-impl';
import {AmpStoryPage, PageState} from '../amp-story-page';
import {MediaType} from '../media-pool';


describes.realWin('amp-story-page', {amp: true}, env => {
  let win;
  let element;
  let page;

  beforeEach(() => {
    win = env.win;

    const mediaPoolRoot = {
      getElement: () => win.document.createElement('div'),
      getMaxMediaElementCounts: () => ({
        [MediaType.VIDEO]: 8,
        [MediaType.AUDIO]: 8,
      }),
    };

    const story = win.document.createElement('amp-story');
    story.getImpl = () => Promise.resolve(mediaPoolRoot);

    element = win.document.createElement('amp-story-page');
    element.getAmpDoc = () => new AmpDocSingle(win);
    story.appendChild(element);
    win.document.body.appendChild(story);

    page = new AmpStoryPage(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('should build a page', () => {
    page.buildCallback();
    return page.layoutCallback();
  });

  it('should not build the animation manager if no element is animated', () => {
    page.buildCallback();
    return page.layoutCallback().then(() => {
      expect(page.animationManager_).to.be.null;
    });
  });

  it('should build the animation manager if an element is animated', () => {
    // Adding an element that has to be animated.
    const animatedEl = win.document.createElement('div');
    animatedEl.setAttribute('animate-in', 'fade-in');
    element.appendChild(animatedEl);
    element.getAmpDoc = () => new AmpDocSingle(win);

    page.buildCallback();
    expect(page.animationManager_).to.exist;
  });

  it('should set an active attribute when state becomes active', () => {
    page.buildCallback();
    return page.layoutCallback().then(() => {
      page.setState(PageState.ACTIVE);

      expect(page.element).to.have.attribute('active');
    });
  });

  it('should start the advancement when state becomes active', () => {
    const advancementStartStub = sandbox.stub(page.advancement_, 'start');

    page.buildCallback();
    return page.layoutCallback().then(() => {
      page.setState(PageState.ACTIVE);

      expect(advancementStartStub).to.have.been.calledOnce;
    });
  });

  it('should start the animations if needed when state becomes active', () => {
    // Adding an element that has to be animated.
    const animatedEl = win.document.createElement('div');
    animatedEl.setAttribute('animate-in', 'fade-in');
    element.appendChild(animatedEl);

    page.buildCallback();
    return page.layoutCallback().then(() => {
      const animateInStub = sandbox.stub(page.animationManager_, 'animateIn');

      page.setState(PageState.ACTIVE);

      expect(animateInStub).to.have.been.calledOnce;
    });
  });

  it('should perform media operations when state becomes active', done => {
    const videoEl = win.document.createElement('video');
    videoEl.setAttribute('src', 'https://example.com/video.mp3');
    element.appendChild(videoEl);

    let mediaPoolMock;

    page.buildCallback();
    page.layoutCallback()
        .then(() => page.mediaPoolPromise_)
        .then(mediaPool => {
          mediaPoolMock = sandbox.mock(mediaPool);
          mediaPoolMock
              .expects('register')
              .withExactArgs(videoEl)
              .once();

          mediaPoolMock
              .expects('preload')
              .withExactArgs(videoEl)
              .returns(Promise.resolve())
              .once();

          mediaPoolMock
              .expects('play')
              .withExactArgs(videoEl)
              .once();

          page.setState(PageState.ACTIVE);

          // `setState` runs code that creates subtasks (Promise callbacks).
          // Waits for the next frame to make sure all the subtasks are
          // already executed when we run the assertions.
          win.requestAnimationFrame(() => {
            mediaPoolMock.verify();
            done();
          });
        });
  });

  it('should stop the advancement when state becomes not active', () => {
    const advancementStopStub = sandbox.stub(page.advancement_, 'stop');

    page.buildCallback();
    return page.layoutCallback().then(() => {
      page.setState(PageState.NOT_ACTIVE);

      expect(advancementStopStub).to.have.been.calledOnce;
    });
  });

  it('should stop the animations when state becomes not active', () => {
    // Adding an element that has to be animated.
    const animatedEl = win.document.createElement('div');
    animatedEl.setAttribute('animate-in', 'fade-in');
    element.appendChild(animatedEl);

    page.buildCallback();
    return page.layoutCallback().then(() => {
      const cancelAllStub = sandbox.stub(page.animationManager_, 'cancelAll');

      page.setState(PageState.NOT_ACTIVE);

      expect(cancelAllStub).to.have.been.calledOnce;
    });
  });

  it('should pause/rewind media when state becomes not active', done => {
    const videoEl = win.document.createElement('video');
    videoEl.setAttribute('src', 'https://example.com/video.mp3');
    element.appendChild(videoEl);

    let mediaPoolMock;

    page.buildCallback();
    page.layoutCallback()
        .then(() => page.mediaPoolPromise_)
        .then(mediaPool => {
          mediaPoolMock = sandbox.mock(mediaPool);
          mediaPoolMock
              .expects('pause')
              .withExactArgs(videoEl, true /** rewindToBeginning */)
              .once();

          page.setState(PageState.NOT_ACTIVE);

          // `setState` runs code that creates subtasks (Promise callbacks).
          // Waits for the next frame to make sure all the subtasks are
          // already executed when we run the assertions.
          win.requestAnimationFrame(() => {
            mediaPoolMock.verify();
            done();
          });
        });
  });

  it('should stop the advancement when state becomes paused', () => {
    const advancementStopStub = sandbox.stub(page.advancement_, 'stop');

    page.buildCallback();
    return page.layoutCallback().then(() => {
      page.setState(PageState.PAUSED);

      expect(advancementStopStub).to.have.been.calledOnce;
    });
  });

  it('should pause media when state becomes paused', done => {
    const videoEl = win.document.createElement('video');
    videoEl.setAttribute('src', 'https://example.com/video.mp3');
    element.appendChild(videoEl);

    let mediaPoolMock;

    page.buildCallback();
    page.layoutCallback()
        .then(() => page.mediaPoolPromise_)
        .then(mediaPool => {
          mediaPoolMock = sandbox.mock(mediaPool);
          mediaPoolMock
              .expects('pause')
              .withExactArgs(videoEl, false /** rewindToBeginning */)
              .once();

          page.setState(PageState.PAUSED);

          // `setState` runs code that creates subtasks (Promise callbacks).
          // Waits for the next frame to make sure all the subtasks are
          // already executed when we run the assertions.
          win.requestAnimationFrame(() => {
            mediaPoolMock.verify();
            done();
          });
        });
  });
});
