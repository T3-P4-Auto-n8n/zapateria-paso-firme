import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import contextlib
import io
import json
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('comparison', ROOT / 'scripts/comparar_modelos.py')
MODULE = importlib.util.module_from_spec(SPEC)
if SPEC.loader and Path(SPEC.origin).exists():
    SPEC.loader.exec_module(MODULE)

class ComparisonTests(unittest.TestCase):
    def test_exact_schema_and_empty_concept(self):
        self.assertTrue(hasattr(MODULE, 'score'), 'score is missing')
        expected = {'ordenante': 'ROMERO D', 'importe': 10, 'concepto': ''}
        self.assertEqual(MODULE.score(expected, expected), {'schema': True, 'exact': True})
        for invalid in [None, [], dict(expected, decision='registrar'), dict(expected, importe='10'), dict(expected, importe=True)]:
            self.assertFalse(MODULE.score(invalid, expected)['schema'])
        self.assertFalse(MODULE.score(dict(expected, importe=20), expected)['exact'])

    def test_only_fictional_payment_fields_leave(self):
        self.assertTrue(hasattr(MODULE, 'fixtures'), 'fixtures is missing')
        fixtures = MODULE.fixtures(ROOT / 'data/correos')
        self.assertEqual(len(fixtures), 9)
        self.assertIsNone(fixtures['08_publicidad_banco'])
        self.assertEqual(fixtures['01_bizum_carmen'], {'ordenante': 'CARMEN RUIZ GARCIA', 'importe': '10,00 EUR', 'concepto': 'zuecos'})
        self.assertFalse(any('@' in str(value) or '4821' in str(value) for value in fixtures.values()))

    def test_failures_count_in_accuracy_not_latency(self):
        self.assertTrue(hasattr(MODULE, 'summarize'), 'summarize is missing')
        rows = [{'http_status': 200, 'elapsed_ms': 100, 'schema': True, 'exact': True}, {'http_status': 429, 'elapsed_ms': 10, 'schema': False, 'exact': False}, {'http_status': 200, 'elapsed_ms': 300, 'schema': True, 'exact': False}]
        result = MODULE.summarize(rows)
        self.assertEqual(result['attempts'], 3)
        self.assertEqual(result['exact'], 1)
        self.assertEqual(result['http_errors'], 1)
        self.assertEqual(result['median_success_ms'], 200)
        self.assertEqual(result['p95_success_ms'], 300)

    def test_malformed_success_envelope_preserves_error_accounting(self):
        class Response:
            status = 200
            def __enter__(self): return self
            def read(self): return '{"choices":null}'
            def __exit__(self, *args): pass
        with tempfile.TemporaryDirectory() as directory, patch.object(MODULE.urllib.request, 'urlopen', return_value=Response()), patch.object(MODULE.time, 'sleep'), contextlib.redirect_stdout(io.StringIO()):
            result = MODULE.run('test-only', ROOT / 'data/correos', Path(directory) / 'result.json', rounds=1)
        self.assertEqual(len(result['requests']), 16)
        self.assertTrue(all(not row['exact'] and row.get('error') for row in result['requests']))

if __name__ == '__main__':
    unittest.main()
