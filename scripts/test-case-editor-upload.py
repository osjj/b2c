"""Real case form in an isolated fixture; no live DB or storage requests."""
import base64
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1sAAAAASUVORK5CYII=')
QA = Path('.trellis/tasks/10-06-case-editor-image-upload/qa')
QA.mkdir(parents=True, exist_ok=True)


def image(name='photo.png', content=PNG, mime='image/png'):
    return {'name': name, 'mimeType': mime, 'buffer': content}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    pending_requests = set()
    page.on('request', lambda request: pending_requests.add(request.url))
    page.on('requestfinished', lambda request: pending_requests.discard(request.url))
    page.on('requestfailed', lambda request: pending_requests.discard(request.url))
    page.on('pageerror', lambda error: errors.append(str(error)))
    calls = []
    mode = {'value': 'success', 'fail_once': True}
    busy_checks = []

    def upload(route):
        body = route.request.post_data_buffer or b''
        match = re.search(rb'filename="([^"]+)"', body)
        name = match.group(1).decode() if match else 'unknown'
        calls.append(name)
        # Assert locks while the HTTP response is outstanding.
        assert all(button.is_disabled() for button in page.get_by_role('button', name='Save draft', exact=True).all())
        assert page.get_by_role('button', name='Remove Image 1', exact=True).is_disabled()
        assert page.get_by_role('button', name='Move Image 1 down', exact=True).is_disabled()
        assert page.locator('#case-status').is_disabled()
        assert page.locator('#case-cover-upload').is_disabled()
        busy_checks.append(True)
        if mode['value'] == 'http-error' or (name == 'fail.png' and mode['fail_once']):
            mode['fail_once'] = False
            route.fulfill(status=503, json={'error': 'Simulated storage error'})
        elif mode['value'] == 'malformed':
            route.fulfill(status=200, json={'url': 'javascript:alert(1)'})
        elif mode['value'] == 'invalid-json':
            route.fulfill(status=200, body='invalid JSON', content_type='application/json')
        else:
            route.fulfill(status=200, json={'url': f'https://shop.laifappe.com/upload-{len(calls)}.webp'})

    page.route('**/api/upload', upload)
    page.route('https://fonts.googleapis.com/**', lambda route: route.fulfill(status=200, body='', content_type='text/css'))
    page.route('https://fonts.gstatic.com/**', lambda route: route.abort())
    page.route('https://shop.laifappe.com/**', lambda route: route.fulfill(status=200, body=PNG, content_type='image/png'))
    page.goto('http://127.0.0.1:8769/')

    def ready():
        try:
            page.wait_for_load_state('networkidle', timeout=2000)
        except Exception:
            # Windows Chromium can miss this lifecycle event after routed responses.
            # Require a rendered real form and complete responses instead.
            page.wait_for_function('document.readyState === "complete" && document.querySelector("#case-title")')
            assert not pending_requests, list(pending_requests)
        expect(page.locator('#case-title')).to_have_value('Documentary upload fixture')

    ready()
    print('Initial real-component form loaded', flush=True)
    expect(page.get_by_text('Documentary images & placement', exact=True)).to_be_visible()
    assert page.locator('img').count() == 3, 'Public, private and cover previews expected'
    assert page.locator('img[src^="/api/admin/case-images/"]').get_attribute('data-unoptimized') == 'true'

    def uploader(input_id):
        file_input = page.locator(f'[id="{input_id}"]')
        panel = file_input.locator('..')
        # The upload input and button share their bordered panel.
        return file_input, panel

    def allow_and_select(input_id, files):
        file_input, panel = uploader(input_id)
        permission = page.locator(f'[id="{input_id}-permission"]')
        if permission.get_attribute('data-state') != 'checked':
            permission.click()
        file_input.set_input_files(files)
        return panel

    def perform(input_id, files):
        panel = allow_and_select(input_id, files)
        panel.locator('button[data-slot="button"]').click()
        expect(page.get_by_role('button', name='Save draft', exact=True).first).to_be_enabled()
        print(f'Upload scenario completed: {input_id}', flush=True)
        return panel

    # Cover replacement has a visible public preview and does not silently save.
    perform('case-cover-upload', image('cover.png'))
    expect(page.locator('#case-coverImage')).to_have_value('https://shop.laifappe.com/upload-1.webp')
    expect(page.locator('img[src="https://shop.laifappe.com/upload-1.webp"]')).to_be_visible()
    assert page.evaluate('window.__caseSaves || 0') == 0
    expect(page.locator('#case-coverAlt')).to_have_value('Original cover')

    # Append two files in selection order, preserving the existing two records.
    perform('case-gallery-upload', [image('first.png'), image('second.png')])
    expect(page.locator('[id="case-gallery.2.url"]')).to_have_value('https://shop.laifappe.com/upload-2.webp')
    expect(page.locator('[id="case-gallery.3.url"]')).to_have_value('https://shop.laifappe.com/upload-3.webp')
    expect(page.locator('[id="case-gallery.0.caption"]')).to_have_value('Original caption')
    expect(page.locator('[id="case-gallery.0.placement"]')).to_have_value('section:samples')

    # Discover the first row's replacement input from the actual rendered form.
    replacements = page.locator('input[type="file"]').all()
    replacement_id = next(item.get_attribute('id') for item in replacements if item.get_attribute('id') not in ['case-gallery-upload', 'case-cover-upload'])
    perform(replacement_id, image('replacement.png'))
    expect(page.locator('[id="case-gallery.0.url"]')).to_have_value('https://shop.laifappe.com/upload-4.webp')
    expect(page.locator('[id="case-gallery.0.alt"]')).to_have_value('Original public photograph')
    expect(page.locator('[id="case-gallery.0.caption"]')).to_have_value('Original caption')
    expect(page.locator('[id="case-gallery.0.placement"]')).to_have_value('section:samples')

    # Whole selection validation must reject before making any request.
    for files in [[image('valid.png'), image('bad.txt', b'text', 'text/plain')], image('empty.png', b''), image('large.png', b'0' * (10 * 1024 * 1024 + 1))]:
        before = len(calls)
        panel = allow_and_select('case-gallery-upload', files)
        button = panel.locator('button[data-slot="button"]')
        if button.is_enabled():
            button.click()
        expect(panel.get_by_role('alert')).to_be_visible()
        assert len(calls) == before

    # Partial success stays appended; retry uploads only the failed file.
    before = len(calls)
    panel = perform('case-gallery-upload', [image('partial.png'), image('fail.png')])
    expect(panel.get_by_role('alert')).to_be_visible()
    assert calls[before:] == ['partial.png', 'fail.png']
    assert page.locator('[id="case-gallery.4.url"]').count() == 1
    panel.locator('button[data-slot="button"]').click()
    expect(page.get_by_role('button', name='Save draft', exact=True).first).to_be_enabled()
    assert calls[before:] == ['partial.png', 'fail.png', 'fail.png']
    assert page.locator('[id="case-gallery.5.url"]').count() == 1

    # Upload service failures must retain the old cover.
    old_cover = page.locator('#case-coverImage').input_value()
    for failure_mode in ['http-error', 'malformed', 'invalid-json']:
        mode['value'] = failure_mode
        panel = perform('case-cover-upload', image(f'{failure_mode}.png'))
        expect(panel.get_by_role('alert')).to_be_visible()
        expect(page.locator('#case-coverImage')).to_have_value(old_cover)
    mode['value'] = 'success'

    # Explicit save carries images, facts and placement into the next editor load.
    for index in range(2, 6):
        page.locator(f'[id="case-gallery.{index}.alt"]').fill(f'Uploaded photograph {index}')
    page.get_by_role('button', name='Save draft', exact=True).first.click()
    expect(page.get_by_role('status').filter(has_text='Draft saved')).to_be_visible()
    saved = page.evaluate('window.__savedCase')
    assert len(saved['gallery']) == 6
    assert saved['gallery'][0]['caption'] == 'Original caption'
    assert saved['gallery'][0]['placement'] == 'section:samples'
    assert saved['procurement'] == [{'name': 'Work gloves', 'quantity': 200, 'unit': 'pairs', 'note': 'Original note'}]
    assert saved['status'] == 'DRAFT' and saved['publicationApproved'] is False
    page.reload()
    ready()
    expect(page.locator('[id="case-gallery.5.url"]')).to_have_value(saved['gallery'][5]['url'])
    expect(page.locator('#case-coverImage')).to_have_value(old_cover)
    page.screenshot(path=str(QA / 'editor-desktop.png'), full_page=True)

    # Cover removal does not delete any gallery row.
    page.get_by_role('button', name=re.compile('Remove cover', re.I)).click()
    expect(page.locator('#case-coverImage')).to_have_value('')
    assert page.locator('[id="case-gallery.5.url"]').count() == 1

    # Capacity overflow must reject the whole batch before uploading.
    add_url = page.get_by_role('button', name='Add image URL', exact=True)
    for _ in range(23):
        add_url.click()
    assert page.locator('[id="case-gallery.28.url"]').count() == 1
    before = len(calls)
    panel = allow_and_select('case-gallery-upload', [image('overflow1.png'), image('overflow2.png')])
    button = panel.locator('button[data-slot="button"]')
    if button.is_enabled():
        button.click()
    expect(panel.get_by_role('alert')).to_be_visible()
    assert len(calls) == before

    # Keyboard form submit also cannot persist during an outstanding upload.
    # Verified HTTP callback locks above cover all upload entry points.
    assert busy_checks and len(busy_checks) == len(calls)
    page.reload()
    ready()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(QA / 'editor-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
    page.locator('#case-gallery-upload').scroll_into_view_if_needed()
    page.screenshot(path=str(QA / 'gallery-mobile-viewport.png'))
    page.locator('#case-cover-upload').scroll_into_view_if_needed()
    page.screenshot(path=str(QA / 'cover-mobile-viewport.png'))
    assert not errors, errors
    result = {'passed': True, 'uploadRequests': len(calls), 'busyChecks': len(busy_checks), 'savedGallery': len(saved['gallery']), 'consoleErrors': errors, 'liveWrites': 0}
    (QA / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))
    browser.close()
