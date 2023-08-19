# -*- encoding: utf-8 -*-
'''
First, install the latest release of Python wrapper: $ pip install ovh
'''
import argparse
import logging
import sys
from urllib.parse import urlparse, urljoin
import requests
import os
import json
import ovh
import argparse

# Instanciate an OVH Client.
# You can generate new credentials with full access to your account on
# the token creation page
client = ovh.Client(
    # Endpoint of API OVH Europe (List of available endpoints)
    endpoint='ovh-eu',
    application_key='a7a71aef0e7b53ca',    # Application Key
    application_secret='54b11c8aef0918e22c2fea40db9133b1',  # Application Secret
    consumer_key='b9902ea271ea0038cb61cac14b9c5da2',       # Consumer Key
)

# extensions = [".com", ".fr", '.net', '.us', ".co", '.org']


def printDX(string, var=""):
    print(string, var)
    sys.stdout.flush()

# def get_all_website_links(url):
#     try:

#     except Exception as e:
#         printDX(e)

#     return urls


extensions = client.get("/domain/data/extension", country="FR")
if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser('Get pdf document from URL')

        parser.add_argument(
            "--domain",
            default='domain',
            type=str,
            help="Input: domain to check")
        parser.add_argument(
            "--cartId",
            default='cartId',
            type=str,
            help="Input: cartId")
        parser.add_argument(
            "--modal",
            default='modal',
            type=str,
            help="Input: modal")
        args = parser.parse_args()
        cartId = args.cartId
        domain = args.domain
        modal = args.modal
        if not domain and not modal:
            result = client.get('/domain')
            print(json.dumps(result))
        else:
            cart = client.post(
                "/order/cart", ovhSubsidiary="FR", _need_auth=False)
            # Pretty print
            if modal:
                modal = json.loads(modal)
            else:
                modal = {"finalList": ""}
            if type(modal['finalList']) == list and modal['finalList'] != [""]:
                try:
                    if modal['country'] in ['AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DG', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EA', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'IC', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TA', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW']:
                       country = modal['country']
                    else :
                       country = "FR"
                    for domain in modal['finalList']:
                        try:
                            item = client.post(
                                "/order/cart/{0}/domain".format(cart.get("cartId")), domain=domain)
                            configurations = client.get(
                                "/order/cart/{0}/item/{1}/requiredConfiguration".format(cart["cartId"], item["itemId"]))
                            for configuration in configurations:
                                if configuration["label"] == "ACKNOWLEDGE_PREMIUM_PRICE":

                                    configuration = client.post("/order/cart/{0}/item/{1}/configuration".format(cart["cartId"], item["itemId"]),
                                                                label="ACKNOWLEDGE_PREMIUM_PRICE",
                                                                value=item["prices"][0]["price"]["value"],
                                                                )
                                # owner contact configuration required
                                if configuration["label"] == "OWNER_CONTACT":
                                    # contact creation

                                    contact = client.post("/me/contact",
                                                          firstName=modal['First'],
                                                          lastName=modal['First'],
                                                          legalForm="individual",
                                                          address={
                                                              "country": country,
                                                              "line1": modal['line1'],
                                                              "city": modal['city'],
                                                              "zip": modal['zip']},
                                                          language="fr_FR",
                                                          email=modal['email'],
                                                          phone=modal['Phone'])

                                    # posting the configuration
                                    contactList = client.get('/me/contact')

                                    configuration = client.post("/order/cart/{0}/item/{1}/configuration".format(cart["cartId"], item["itemId"]),
                                                                label="OWNER_CONTACT",
                                                                value="/me/contact/{0}".format(
                                                                    contactList[len(contactList) - 1]),
                                                                )

                        except Exception as e:
                            pass
                    client.post(
                        "/order/cart/{0}/assign".format(cart.get("cartId")))
                    salesorder = client.get(
                        "/order/cart/{0}/checkout".format(cart.get("cartId")))
                    salesorder = client.post(
                        "/order/cart/{0}/checkout".format(cart.get("cartId")))
                    print(json.dumps(salesorder["url"]))

                except Exception as e:
                    print(e)
                    pass
            else:
                finalJson = []
                try:
                    if "." in domain:
                        domain = domain.split(".")
                        ex = domain[1]
                        domain = domain[0]
                    extensions.remove(ex)
                    result = client.get(
                        "/order/cart/{0}/domain".format(cart.get("cartId")), domain=domain + "." + ex)
                    finalJson.append(result)
                    for extension in extensions[0:10]:
                        result = client.get(
                            "/order/cart/{0}/domain".format(cart.get("cartId")), domain=domain + "." + extension)
                        finalJson.append(result)
                except Exception as e:
                    try:
                        cart = client.post(
                            "/order/cart", ovhSubsidiary="FR", _need_auth=False)
                        for extension in extensions[0:10]:
                            result = client.get(
                                "/order/cart/{0}/domain".format(cart.get("cartId")), domain=domain + "." + extension)
                            finalJson.append(result)
                    except Exception as e:
                        pass
                print(json.dumps(finalJson))

    except Exception as e:
        logging.exception("An exception was thrown!")
        pass
