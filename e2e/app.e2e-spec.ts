import { AntsPage } from './app.po';

describe('ants App', function() {
  let page: AntsPage;

  beforeEach(() => {
    page = new AntsPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
