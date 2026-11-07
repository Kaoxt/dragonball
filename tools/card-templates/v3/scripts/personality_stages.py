"""Normalize source charts to the printed highest-to-zero order."""


def printed_stages(values):
    values = list(values)
    if not values or any(type(v) is not int or v < 0 for v in values):
        raise ValueError('Power stages must be nonnegative integers')
    if values.count(0) != 1:
        raise ValueError('Power stages must contain exactly one zero')
    if values == sorted(values, reverse=True):
        return values
    if values == sorted(values):
        return values[::-1]
    raise ValueError('Power stages must be monotonic; review the original scan')
