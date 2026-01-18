"""
Church discovery data sources.

Each source module should implement:
- fetch() - Fetch raw data from the source
- parse() - Parse raw data into RawParishRecord objects
- check_robots() - Check robots.txt compliance
"""

from .assembly_of_bishops import AssemblyOfBishopsSource

__all__ = ['AssemblyOfBishopsSource']
